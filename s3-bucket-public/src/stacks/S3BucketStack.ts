/* core CDK imports */
import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import {
	Bucket,
	HttpMethods,
	BucketEncryption,
	IBucket,
	ObjectOwnership,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

/* custom util imports */
import { getSuffixFromStack } from "../functions/getSuffixFromStack";

/* props */
interface S3BucketStackProps extends StackProps {
	appId?: string;
	envName?: string;
	bucketName: string;
	versioned?: boolean;
	encryption?: BucketEncryption;
}

/* stack class */
export class S3BucketStack extends Stack {
	public readonly S3Bucket: IBucket;

	constructor(scope: Construct, id: string, props: S3BucketStackProps) {
		super(scope, id, props);

		/* set the env variable from context */
		const appId = props.appId;
		const envName = props.envName;
		const suffix = getSuffixFromStack(this);

		/* set default values for optional props */
		const versioned = props.versioned ?? true; /* default to versioned */
		const encryption =
			props.encryption ??
			BucketEncryption.S3_MANAGED; /* default to S3 managed encryption */

		/* construct full bucket name */
		const fullBucketName = `${envName}-${appId}-${props.bucketName}-s3-bucket-${suffix}`;

		/* create the S3 Bucket */
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

		/* output the bucket name */
		new CfnOutput(this, "S3BucketName", {
			value: this.S3Bucket.bucketName,
			exportName: `${envName}-${appId}-${props.bucketName}-s3-bucket-name`,
		});
	}
}
