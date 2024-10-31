/* core CDK imports */
import { App } from "aws-cdk-lib";

/* sset up the App */
const app = new App();

/* Import stacks */
import { LambdaLayerStack } from "./stacks/LambdaLayerStack";

/* Get the context vars to pass to the StackName value */
/* NOTE: This allows us to re-use the same code and only change some configs per app */
const appId = app.node.tryGetContext("appId") || "myapp";
const env = app.node.tryGetContext("env") || "prod";
const envKey = app.node.tryGetContext(env);

/* Get environment-specific config values */
const envName = envKey.name;

/* Ref Stack */
new LambdaLayerStack(app, `${envName}-${appId}-lambda-layer`, {
});

/* Synthesize the app */
app.synth();