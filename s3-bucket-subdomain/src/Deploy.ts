/* core CDK imports */
import { App } from "aws-cdk-lib";

/* import stacks */
import { S3PublicBucketStack } from "./stacks/S3PublicBucketStack";

/* set up the App */
const app = new App();

/* get the context vars to pass to the StackName value */
const appId = app.node.tryGetContext("appId") || "myapp";
const appDomain = app.node.tryGetContext("appDomain") || "mysite.com";
const env = app.node.tryGetContext("env") || "dev";
const envKey = app.node.tryGetContext(env);
const envName = envKey?.name || "dev";
const envImagesSubdomain = envKey?.imagesSubdomain || "dev-images";

/* S3 bucket for uploads */
new S3PublicBucketStack(app, "ImagesBucketStack", {
	stackName: `${envName}-${appId}-s3-images`,
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
	appId: appId,
	appDomain: appDomain,
	envName: envName,
	envSubDomain: envImagesSubdomain,
	bucketName: "images",
});
