/**
 * Requires AWS CLI to have been set up on the Amazon server
 * (~/.aws directory on server needs to be instantiated with access key/secret access key pair)
 */


// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');

/**
 * Returns a Promise that returns the state of a server upon success.
 *
 * @param instanceID the EC2 instance ID of the single server we wish to check the state of
 * @param region the region the EC2 instance is located in, see:
 *        https://docs.aws.amazon.com/general/latest/gr/rande.html
 *        Tokyo is 'ap-northeast-1'
 * @return state value: 'pending', 'running', 'stopping, 'stopped', 'shutting-down', 'terminated'
 *          as per: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html
 */
function checkServerState(instanceID, region){
    return new Promise(function(resolve, reject){
        let ec2 = new AWS.EC2({apiVersion: '2016-11-15', region: region});
        let params = {
            InstanceIds: [instanceID]
        };

        // Call EC2 to retrieve policy for selected bucket
        ec2.describeInstances(params, function(err, data) {
            if (err) {
                reject(err.stack);
            } else {
                let state = data['Reservations'][0]['Instances'][0]['State']['Name'];
                resolve(state);
            }
        });
    });
}


// Sample usage:

/*
let deadServer = 'i-090615b4ec9481926';
let aliveServer = 'i-0c309c24f45825f36';
const tokyoRegion = 'ap-northeast-1';

checkServerState(dead, tokyoRegion).then(
    state => console.log(dead,'is',state),  //'i-090615b4ec9481926 is stopped'
    error => console.log(error),
);


checkServerState(alive, tokyoRegion).then(
    state => console.log(alive,'is',state), //'i-0c309c24f45825f36 is running'
    error => console.log(error)
);
*/
module.exports = checkServerState;