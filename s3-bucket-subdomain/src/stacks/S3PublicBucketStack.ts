/**
 * S3PublicBucketStack
 * Creates an S3 bucket and sets up a CloudFront distribution with a custom domain
 * NOTE: this is for assets like images and NOT for static HTML sites
 */

/* core CDK imports */
import { Stack, StackProps, Duration, CfnOutput } from "aws-cdk-lib";
import {
	Bucket,
	HttpMethods,
	BucketEncryption,
	ObjectOwnership,
	IBucket,
} from "aws-cdk-lib/aws-s3";
import {
	Distribution,
	OriginAccessIdentity,
	ErrorResponse,
	ViewerProtocolPolicy,
	ResponseHeadersPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { HostedZone, ARecord, RecordTarget } from "aws-cdk-lib/aws-route53";
import {
	Certificate,
	CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";

/* util imports */
import { Construct } from "constructs";

/* custom util imports */
import { getSuffixFromStack } from "../functions/getSuffixFromStack";

/* set props */
interface S3PublicBucketStackProps extends StackProps {
	appId?: string;
	appDomain: string;
	envName?: string;
	envSubDomain?: string;
	bucketName: string;
	versioned?: boolean;
	encryption?: BucketEncryption;
}

/**
 * S3PublicBucketStack
 * Creates an S3 bucket and sets up a CloudFront distribution with a custom domain
 */
export class S3PublicBucketStack extends Stack {
	public readonly S3Bucket: IBucket;

	constructor(scope: Construct, id: string, props: S3PublicBucketStackProps) {
		super(scope, id, props);

		const { appId, appDomain, envName, envSubDomain } = props;
		const suffix = getSuffixFromStack(this);

		/* set default values for optional props */
		const versioned = props.versioned ?? true; /* default to versioned */
		const encryption =
			props.encryption ??
			BucketEncryption.S3_MANAGED; /* default to S3 managed encryption */

		/* construct full bucket name */
		const fullBucketName = `${envName}-${appId}-${props.bucketName}-s3-bucket-${suffix}`;

		/* create the S3 Bucket with the required properties */
		this.S3Bucket = new Bucket(this, "S3Bucket", {
			bucketName: fullBucketName,
			versioned: versioned,
			encryption: encryption,
			cors: [
				{
					allowedMethods: [
						HttpMethods.HEAD,
						HttpMethods.GET,
						HttpMethods.PUT,
					],
					allowedOrigins: ["*"],
					allowedHeaders: ["*"],
				},
			],
			objectOwnership: ObjectOwnership.OBJECT_WRITER,
			blockPublicAccess: {
				blockPublicAcls: false,
				blockPublicPolicy: false,
				ignorePublicAcls: false,
				restrictPublicBuckets: false,
			},
		});

		/* Output the S3 bucket name */
		new CfnOutput(this, "S3BucketName", {
			value: this.S3Bucket.bucketName,
			exportName: `${envName}-${appId}-${props.bucketName}-s3-bucket-name-${suffix}`,
		});

		const fullDomain = `${envSubDomain}.${appDomain}`;

		/* need origin ID to allow the CloudFront distribution to access the S3 bucket */
		const originIdentity = new OriginAccessIdentity(
			this,
			"OriginAccessIdentity"
		);
		this.S3Bucket.grantRead(originIdentity);

		/* lookup the hosted zone for the domain */
		const zone = HostedZone.fromLookup(this, "baseZone", {
			domainName: appDomain,
		});

		/**
		 * Request the certificate
		 * CDK will handle domain ownership validation via CNAME DNS entries in Route53
		 */
		const cert = new Certificate(this, "ACMSubdomainCert", {
			domainName: fullDomain,
			validation: CertificateValidation.fromDns(zone),
		});

		/* custom error responses */
		const errorResponse404: ErrorResponse = {
			httpStatus: 404,
			responseHttpStatus: 404,
			responsePagePath: "/404.html",
		};

		/* custom response headers policy (for performance and security) */
		const responseHeadersPolicy = new ResponseHeadersPolicy(
			this,
			"OptimalPerformancePolicy",
			{
				responseHeadersPolicyName: `${envName}-${appId}-cache-gzip-policy-${suffix}`,
				comment:
					"Sets optimal caching and security headers for a static S3 site.",
				securityHeadersBehavior: {
					strictTransportSecurity: {
						override: true,
						accessControlMaxAge: Duration.seconds(31536000), // One year in seconds
						includeSubdomains: true,
					},
					contentTypeOptions: { override: true },
				},
				customHeadersBehavior: {
					customHeaders: [
						{
							header: "Cache-Control",
							value: "max-age=31536000",
							override: true,
						},
						{
							header: "Accept-Encoding",
							value: "gzip, deflate, br",
							override: true,
						},
					],
				},
			}
		);

		/* CloudFront distribution configuration */
		const cfDist = new Distribution(this, "S3PublicBucketDistribution", {
			comment: fullDomain,
			defaultBehavior: {
				origin: new S3Origin(this.S3Bucket, {
					originAccessIdentity: originIdentity,
				}),
				viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				responseHeadersPolicy: responseHeadersPolicy,
			},
			certificate: cert,
			domainNames: [fullDomain],
			errorResponses: [errorResponse404],
		});

		/* Create DNS entry in Route53 as an alias to the new CloudFront Distribution */
		new ARecord(this, "Route53AliasRecord", {
			zone,
			recordName: fullDomain,
			target: RecordTarget.fromAlias(new CloudFrontTarget(cfDist)),
		});
	}
}
