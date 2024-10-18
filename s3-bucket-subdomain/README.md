# CDK app to deploy public S3 Bucket attached to a sub-domain (e.g. https://assets.mysite.com)

This CDK app simply deploys an S3 bucket with public ACLs configured to serve files publicly and attached to a CloudFront distribution that points to a configured subdomain - that is registered and has a hosted zone on the same AWS account.

**NOTE**: this project is not actively maintained, but can be used and updated as needed

## Installation

1. Run NPM install

`npm i`

2. Set the desired configs in the `cdk.json` file, which is set up for multiple environments (e.g. dev, prod, staging, etc.) and where the domain and subdomains can be added.

For example, the `prod` environment configs should be set like this:

```
"context": {
	...
	"appId": "my-app-name",
	"appDomain": "mydomain.com",
	"deploy": "default",
	"env": "prod",
	"prod": {
		"name": "prod",
		"imagesSubdomain": "images"
	}
}
```

NOTE: you can deploy multiple S3 buckets with different subdomains using different keys (e.g. assetsSubdomain, uploadsSubdomain, etc.)

3. Run `cdk synth`

4. Run `cdk deploy --all`

5. (optional) Use Context values to create different stages / environments

-   submit the cdk commands with the `--context` or `-c` flag (leaving this empty will use the default values for `dev`)

```
cdk synth -c env=prod
cdk deploy --all -c env=prod
```
