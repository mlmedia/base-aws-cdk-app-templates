# CDK Setup for a WordPress installation on a single t2.micro instance

-   NOTE: Ideally, this architecture should include a separate database instance which in a private subnet with NAT Gateways, Auto-scaling, and load balancing, however, that setup costs a lot more that this one. This one is included in the Free Tier, and would cost approximately $8-9 per month without any additional configurations.

PLEASE NOTE: check the AWS Pricing Calculator to confirm these numbers. Things change frequently on AWS.

## SETUP

Create a Key Pair in AWS Management Console:

- Go to the EC2 Dashboard in the AWS Management Console.
- In the left-hand menu, click on "Key Pairs".
- Click the "Create key pair" button.
- Provide a name for the key pair (e.g., my-key-pair), and then click "Create key pair".
- Download the .pem file and keep it secure.
