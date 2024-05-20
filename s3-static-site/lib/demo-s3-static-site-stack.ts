import { Stack, StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { join } from "path";
import { existsSync } from "fs";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Distribution, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";

interface DemoS3StaticSiteStackProps extends StackProps {
	stageName?: string;
}

export class DemoS3StaticSiteStack extends Stack {
	public readonly deploymentBucket: Bucket;
	constructor(scope: Construct, id: string, props: DemoS3StaticSiteStackProps) {
		super(scope, id, props);

		const deploymentBucket = new Bucket(this, "S3StaticSiteBucket", {
			bucketName: `static-site-test-20240313`,
		});

		const uiDir = join(
			__dirname,
			"..",
			"static-site"
		);
		if (!existsSync(uiDir)) {
			console.warn("Ui dir not found: " + uiDir);
			return;
		}

		new BucketDeployment(this, "DemoStaticSiteDeployment", {
			destinationBucket: deploymentBucket,
			sources: [Source.asset(uiDir)],
		});

		const originIdentity = new OriginAccessIdentity(
			this,
			"OriginAccessIdentity"
		);
		deploymentBucket.grantRead(originIdentity);

		new Distribution(
			this,
			"GrainCMSFrontDistribution",
			{
				defaultRootObject: "index.html",
				defaultBehavior: {
					origin: new S3Origin(deploymentBucket, {
						originAccessIdentity: originIdentity,
					}),
				},
			}
		);
	}
}
