/* core CDK imports */
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
	Vpc,
	SecurityGroup,
	Instance,
	InstanceType,
	InstanceClass,
	InstanceSize,
	AmazonLinux2023ImageSsmParameter,
	AmazonLinux2023Kernel,
	SubnetType,
	Peer,
	Port,
	KeyPair,
} from "aws-cdk-lib/aws-ec2";
import { HostedZone, ARecord, RecordTarget } from "aws-cdk-lib/aws-route53";
import {
	Certificate,
	CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";

/* utility imports */
import * as dotenv from "dotenv";

/* set up dotenv config */
dotenv.config();

/* environment configs to pass to user data script */
const DB_NAME = process.env.DB_NAME as string;
const DB_USER = process.env.DB_USER as string;
const DB_PASSWORD = process.env.DB_PASSWORD as string;
const KEY_PAIR_NAME = process.env.KEY_PAIR_NAME as string;
const DOMAIN_NAME = process.env.DOMAIN_NAME as string;
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID as string;
const BASE_DOMAIN_NAME = process.env.BASE_DOMAIN_NAME as string;

/* stack class */
export class WordPressStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		/* VPC resource */
		const vpc = new Vpc(this, "Vpc", {
			maxAzs: 2,
			natGateways: 0,
			subnetConfiguration: [
				{
					name: "public",
					subnetType: SubnetType.PUBLIC,
				},
			],
		});

		/* security group */
		const wpSecurityGroup = new SecurityGroup(
			this,
			"WordPressSecurityGroup",
			{
				vpc,
				allowAllOutbound: true,
				description: "Security group for WordPress instance",
			}
		);

		/* add ingress rules */
		wpSecurityGroup.addIngressRule(
			Peer.anyIpv4(),
			Port.tcp(22),
			"Allow SSH access"
		);
		wpSecurityGroup.addIngressRule(
			Peer.anyIpv4(),
			Port.tcp(80),
			"Allow HTTP access"
		);
		wpSecurityGroup.addIngressRule(
			Peer.anyIpv4(),
			Port.tcp(443),
			"Allow HTTPS access"
		);

		/**
		 * get the existing key pair
		 * NOTE: this must be created in the Console
		 **/
		const keyPair = KeyPair.fromKeyPairName(
			this,
			"ImportedKeyPair",
			KEY_PAIR_NAME
		);

		/* EC2 instance (LAMP stack with WordPress) */
		const wpInstance = new Instance(this, "WordPressInstance", {
			vpc,
			instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
			machineImage: new AmazonLinux2023ImageSsmParameter({
				kernel: AmazonLinux2023Kernel.KERNEL_6_1,
			}),
			securityGroup: wpSecurityGroup,
			keyPair,
		});

		/* domain hosted zone resource */
		const hostedZone = HostedZone.fromHostedZoneAttributes(
			this,
			"HostedZone",
			{
				hostedZoneId: HOSTED_ZONE_ID,
				zoneName: BASE_DOMAIN_NAME,
			}
		);

		/* ACS certificate */
		new Certificate(this, "Certificate", {
			domainName: DOMAIN_NAME,
			validation: CertificateValidation.fromDns(hostedZone),
		});

		/* add the user data script for installations + setup */
		wpInstance.addUserData(
			`#!/bin/bash`,
			`sudo su`,
			`yum update -y`,
			`yum install -y httpd mariadb105-server php php-mysqlnd mod_ssl wget`,
			`systemctl start httpd`,
			`systemctl enable httpd`,
			`systemctl start mariadb`,
			`systemctl enable mariadb`,
			`mysql -e "CREATE DATABASE ${DB_NAME};"`,
			`mysql -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"`,
			`mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"`,
			`mysql -e "FLUSH PRIVILEGES;"`,
			`mkdir -p /var/www/html`,
			`cd /var/www/html`,
			`wget https://wordpress.org/latest.tar.gz`,
			`tar -xzf latest.tar.gz`,
			`mv wordpress/* .`,
			`rmdir wordpress`,
			`rm -f latest.tar.gz`,
			`chown -R apache:apache /var/www/html`,
			`chmod -R 755 /var/www/html`,
			`echo "<?php define('DB_NAME', '${DB_NAME}'); define('DB_USER', '${DB_USER}'); define('DB_PASSWORD', '${DB_PASSWORD}'); define('DB_HOST', 'localhost'); ?>" > /var/www/html/wp-config.php`,
			`cat <<EOF > /etc/httpd/conf.d/${DOMAIN_NAME}.conf`,
			`<VirtualHost *:80>`,
			`    ServerName ${DOMAIN_NAME}`,
			`    DocumentRoot /var/www/html`,
			`    <Directory /var/www/html>`,
			`        AllowOverride All`,
			`        Require all granted`,
			`    </Directory>`,
			`    ErrorLog /var/log/httpd/${DOMAIN_NAME}_error.log`,
			`    CustomLog /var/log/httpd/${DOMAIN_NAME}_access.log combined`,
			`</VirtualHost>`,
			`EOF`,
			`systemctl restart httpd`,
			`yum install -y certbot python3-certbot-apache`,
			`certbot --apache --non-interactive --agree-tos --email admin@${BASE_DOMAIN_NAME} --domains ${DOMAIN_NAME}`,
			`systemctl restart httpd`
		);

		/* assign a domain or subdomain to the server */
		new ARecord(this, "WordPressARecord", {
			zone: hostedZone,
			target: RecordTarget.fromIpAddresses(wpInstance.instancePublicIp),
			recordName: DOMAIN_NAME /* full domain / subdomain */,
		});
	}
}
