# CDK app to deploy public S3 Bucket

This CDK app simply deploys an S3 bucket with public ACLs configured to serve files publicly. It does not attach to a CloudFront distribution or domain, but it can be used to serve objects publicly such as images and other non-sensitive assets.

**NOTE**: this project is not actively maintained, but can be used and updated as needed

## Installation

1. Run NPM install

`npm i`

2. Set the desired configs in the `cdk.json` file, which is set up for multiple environments (e.g. dev, prod, staging, etc.)

3. Run `cdk synth`

4. Run `cdk deploy --all`

5. (optional) Use Context values to create different stages / environments

-   submit the cdk commands with the `--context` or `-c` flag (leaving this empty will use the default values for `dev`)

```
cdk synth -c env=prod
cdk deploy --all -c env=prod
```

