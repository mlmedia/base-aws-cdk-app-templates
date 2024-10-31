/* core CDK imports */
import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { LayerVersion, Code, Runtime } from "aws-cdk-lib/aws-lambda";

/* util imports */
import { Construct } from "constructs";
import * as path from "path";

/* stack class */
export class LambdaLayerStack extends Stack {
	public readonly layerArn: string;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		/* get the code */
		const sharpLayer = new LayerVersion(this, "sharp-nodejs-18", {
			code: Code.fromAsset(
				path.join(__dirname, "../layers/sharp/nodejs")
			),
			compatibleRuntimes: [Runtime.NODEJS_18_X],
			description:
				"Lambda Layer with Sharp for image processing using Node.js 18",
		});

		/* Save the layer ARN for cross-account, cross-app usage */
		this.layerArn = sharpLayer.layerVersionArn;

		/* Export the layer ARN to make it accessible to other CDK apps */
		new CfnOutput(this, "LambdaLayerArn", {
			value: this.layerArn,
			exportName: "LambdaLayerArn",
		});
	}
}
