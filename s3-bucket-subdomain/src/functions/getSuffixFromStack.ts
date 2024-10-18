/* core CDK imports */
import { Fn, Stack } from "aws-cdk-lib";

/**
 * Get the Stack ID and return as suffix (for renaming conventions)
 * @param stack
 * @returns
 */
export function getSuffixFromStack(stack: Stack) {
	const shortStackId = Fn.select(2, Fn.split("/", stack.stackId));
	const suffix = Fn.select(4, Fn.split("-", shortStackId));
	return suffix;
}
