/* core CDK imports */
import { App } from "aws-cdk-lib";

/* Set up the App */
const app = new App();

/* Import stacks */
import { WordPressStack } from "./stacks/WordPressStack";

/* Get the context vars to pass to the StackName value */
/* NOTE: This allows us to re-use the same code and only change some configs per app */
const appId = app.node.tryGetContext("appId") || "myapp";
const appDomain = app.node.tryGetContext("appDomain");
const env = app.node.tryGetContext("env") || "dev";
const envKey = app.node.tryGetContext(env);

/* Get environment-specific config values */
const envName = envKey.name;

/* WordPress Stack */
new WordPressStack(app, "WordPressStack", {
	stackName: `${envName}-${appId}-wordpress`,
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
});

/* Synthesize the app */
app.synth();
