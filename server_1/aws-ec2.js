// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');

// Create EC2 service object
let ec2 = new AWS.EC2({apiVersion: '2016-11-15', region: 'ap-northeast-1a'});

let params = {
    DryRun: false
};

// Call EC2 to retrieve policy for selected bucket
ec2.describeInstances(params, function(err, data) {
    if (err) {
        console.log("Error", err.stack);
    } else {
        console.log("Success", JSON.stringify(data));
    }
});