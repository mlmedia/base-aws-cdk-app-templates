/* core CDK imports */
import { App } from "aws-cdk-lib";

/* import stacks */
import { S3BucketStack } from "./stacks/S3BucketStack";

/* set up the App */
const app = new App();

/* get the context vars to pass to the StackName value */
const appId = app.node.tryGetContext("appId") || "myapp";
const env = app.node.tryGetContext("env") || "dev";
const envKey = app.node.tryGetContext(env);
const envName = envKey?.name || "defaultEnv";

/* S3 bucket for uploads */
new S3BucketStack(app, "UploadsBucketStack", {
	stackName: `${envName}-${appId}-s3-example`,
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
	appId: appId,
	envName: envName,
	bucketName: "example",
});
