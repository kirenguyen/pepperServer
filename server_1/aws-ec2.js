// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');

// Create EC2 service object


/**
 * Returns a Promise that checks the state of a server.
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
                console.log("Error in retrieving state", err.stack);
                reject(err.stack);
            } else {
                // data['Reservations'].forEach((value) => {
                //     console.log(instanceID + " is " + value['Instances'][0]['State']['Name']);
                // })
                let state = data['Reservations'][0]['Instances'][0]['State']['Name'];
                console.log(instanceID + " is " + state);
                resolve(state);
            }
        });
    });
}

// ,    dead:    'i-090615b4ec9481926'
//      alive:   'i-0c309c24f45825f36'

let dead = 'i-090615b4ec9481926';
let alive = 'i-0c309c24f45825f36';
const tokyoRegion = 'ap-northeast-1';

checkServerState(dead, tokyoRegion).then(
    state => console.log(state),
    error => console.log(error),
);


checkServerState(alive, tokyoRegion).then(
    state => console.log(state),
    error => console.log(error)
);

