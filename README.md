# aws-cdk-apps
Demos and tutorials for the AWS CDK

## Initialize the CDK in an app
Create an empty directory and CD into it
```
mkdir aws-cdk-app && CD aws-cdk-app
```

Init the app (example for TypeScript):
```
cdk init app --language typescript
```

## Delete the app 
NOTE: this may not delete stateful resources like DynamoDB tables, unless specified in the configs
```
cdk destroy
```