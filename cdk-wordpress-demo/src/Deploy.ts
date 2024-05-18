import { App, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
	Vpc,
	SecurityGroup,
	Instance,
	InstanceType,
	InstanceClass,
	InstanceSize,
	AmazonLinuxImage,
	SubnetType,
	Peer,
	Port,
} from "aws-cdk-lib/aws-ec2";
import { HostedZone, ARecord, RecordTarget } from "aws-cdk-lib/aws-route53";
import {
	Certificate,
	CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import * as dotenv from "dotenv";
dotenv.config();

const DB_NAME = process.env.DB_NAME as string;
const DB_USER = process.env.DB_USER as string;
const DB_PASSWORD = process.env.DB_PASSWORD as string;
const KEY_PAIR_NAME = process.env.KEY_PAIR_NAME as string;
const DOMAIN_NAME = process.env.DOMAIN_NAME as string; // e.g., "sub.example.com"
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID as string; // e.g., "Z3P5QSUBDOMAIN3Q2"
const BASE_DOMAIN_NAME = process.env.BASE_DOMAIN_NAME as string; // e.g., "example.com"

class WordpressStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// VPC setup without NAT Gateway
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

		// Security Group for WordPress
		const wordpressSecurityGroup = new SecurityGroup(
			this,
			"WordpressSecurityGroup",
			{
				vpc,
				allowAllOutbound: true,
				description: "Security group for WordPress instance",
			}
		);

		wordpressSecurityGroup.addIngressRule(
			Peer.anyIpv4(),
			Port.tcp(22),
			"Allow SSH access"
		);
		wordpressSecurityGroup.addIngressRule(
			Peer.anyIpv4(),
			Port.tcp(80),
			"Allow HTTP access"
		);
		wordpressSecurityGroup.addIngressRule(
			Peer.anyIpv4(),
			Port.tcp(443),
			"Allow HTTPS access"
		);

		// EC2 Instance for the LAMP stack with WordPress
		const wordpressInstance = new Instance(this, "WordpressInstance", {
			vpc,
			instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
			machineImage: new AmazonLinuxImage(),
			securityGroup: wordpressSecurityGroup,
			keyName: KEY_PAIR_NAME,
		});

		// Hosted Zone for the domain
		const hostedZone = HostedZone.fromHostedZoneAttributes(
			this,
			"HostedZone",
			{
				hostedZoneId: HOSTED_ZONE_ID,
				zoneName: BASE_DOMAIN_NAME,
			}
		);

		// Certificate for the domain
		const certificate = new Certificate(this, "Certificate", {
			domainName: DOMAIN_NAME,
			validation: CertificateValidation.fromDns(hostedZone),
		});

		// User data script to install LAMP stack and WordPress
		wordpressInstance.addUserData(
			`#!/bin/bash`,
			`yum update -y`,
			`yum install -y httpd mysql-server php php-mysqlnd mod_ssl`,
			`systemctl start httpd`,
			`systemctl enable httpd`,
			`systemctl start mysqld`,
			`systemctl enable mysqld`,
			`mysql -e "CREATE DATABASE ${DB_NAME};"`,
			`mysql -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"`,
			`mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"`,
			`mysql -e "FLUSH PRIVILEGES;"`,
			`cd /var/www/html`,
			`wget https://wordpress.org/latest.tar.gz`,
			`tar -xzf latest.tar.gz`,
			`mv wordpress/* .`,
			`rmdir wordpress`,
			`rm -f latest.tar.gz`,
			`chown -R apache:apache /var/www/html`,
			`chmod -R 755 /var/www/html`,
			`echo "<?php define('DB_NAME', '${DB_NAME}'); define('DB_USER', '${DB_USER}'); define('DB_PASSWORD', '${DB_PASSWORD}'); define('DB_HOST', 'localhost'); ?>" > /var/www/html/wp-config.php`,
			`yum install -y epel-release`,
			`yum install -y certbot python3-certbot-apache`,
			`certbot --apache --non-interactive --agree-tos --email admin@${BASE_DOMAIN_NAME} --domains ${DOMAIN_NAME}`,
			`systemctl restart httpd`
		);

		// Assign a domain or subdomain to the server
		new ARecord(this, "WordpressARecord", {
			zone: hostedZone,
			target: RecordTarget.fromIpAddresses(
				wordpressInstance.instancePublicIp
			),
			recordName: DOMAIN_NAME, // Use the full domain name including the subdomain here
		});
	}
}

const app = new App();
new WordpressStack(app, "WordpressStack", {
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
});
app.synth();
