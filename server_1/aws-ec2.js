// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');

// Create EC2 service object
const ec2 = new AWS.EC2({apiVersion: '2016-11-15', region: 'ap-northeast-1'});


// Call EC2 to retrieve policy for selected bucket
// ec2.describeInstances(params, function(err, data) {
//     if (err) {
//         console.log("Error", err.stack);
//     } else {
//         for(let key in data){
//             console.log(key + ':' + data[key]);
//         }
//         console.log()
//     }
//
//
// });


let params = {
    InstanceIds: [ 'i-090615b4ec9481926',
        'i-0c309c24f45825f36'
    ]
};

ec2.monitorInstances(params, function(err, data){
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
})

/*
{"Reservations":[{"Groups":[],"Instances":
[{"AmiLaunchIndex":0,"ImageId":"ami-0ccdbc8c1cb7957be","InstanceId":"i-090615b4ec9481926","InstanceType":"t2.micro","KeyName":"pepperkeypair","LaunchTime":"2019-06-14T02:45:46.000Z","Monitoring":{"State":"disabled"},"Placement":{"AvailabilityZone":"ap-northeast-1a","GroupName":"","Tenancy":"default"},"PrivateDnsName":"ip-172-31-34-41.ap-northeast-1.compute.internal","PrivateIpAddress":"172.31.34.41","ProductCodes":[],"PublicDnsName":"","State":{"Code":80,"Name":"stopped"},"StateTransitionReason":"User initiated (2019-06-17 01:35:14 GMT)","SubnetId":"subnet-9edc36d6","VpcId":"vpc-7f81a818","Architecture":"x86_64","BlockDeviceMappings":[{"DeviceName":"/dev/xvda","Ebs":{"AttachTime":"2019-06-11T02:34:01.000Z","DeleteOnTermination":true,"Status":"attached","VolumeId":"vol-082c45cdbc7fd207d"}}],"ClientToken":"","EbsOptimized":false,"EnaSupport":true,"Hypervisor":"xen","ElasticGpuAssociations":[],"ElasticInferenceAcceleratorAssociations":[],"NetworkInterfaces":[{"Attachment":{"AttachTime":"2019-06-11T02:34:00.000Z","AttachmentId":"eni-attach-07b016a1d68ab486e","DeleteOnTermination":true,"DeviceIndex":0,"Status":"attached"},"Description":"","Groups":[{"GroupName":"default","GroupId":"sg-6594021a"}],"Ipv6Addresses":[],"MacAddress":"06:f6:e5:cf:df:ca","NetworkInterfaceId":"eni-00e13639a287b0ca1","OwnerId":"664995898618","PrivateDnsName":"ip-172-31-34-41.ap-northeast-1.compute.internal","PrivateIpAddress":"172.31.34.41","PrivateIpAddresses":[{"Primary":true,"PrivateDnsName":"ip-172-31-34-41.ap-northeast-1.compute.internal","PrivateIpAddress":"172.31.34.41"}],"SourceDestCheck":true,"Status":"in-use","SubnetId":"subnet-9edc36d6","VpcId":"vpc-7f81a818","InterfaceType":"interface"}],"RootDeviceName":"/dev/xvda","RootDeviceType":"ebs","SecurityGroups":[{"GroupName":"default","GroupId":"sg-6594021a"}],"SourceDestCheck":true,"StateReason":{"Code":"Client.UserInitiatedShutdown","Message":"Client.UserInitiatedShutdown: User initiated shutdown"},"Tags":[{"Key":"Name","Value":"pepper2"}],"VirtualizationType":"hvm","CpuOptions":{"CoreCount":1,"ThreadsPerCore":1},"CapacityReservationSpecification":{"CapacityReservationPreference":"open"},"HibernationOptions":{"Configured":false},"Licenses":[]}],"OwnerId":"664995898618","ReservationId":"r-06fcbab0e56e4e0e1"},{"Groups":[],"Instances":[{"AmiLaunchIndex":0,"ImageId":"ami-0ccdbc8c1cb7957be","InstanceId":"i-0c309c24f45825f36","InstanceType":"t2.micro","KeyName":"pepperkeypair","LaunchTime":"2019-06-17T04:24:24.000Z","Monitoring":{"State":"disabled"},"Placement":{"AvailabilityZone":"ap-northeast-1a","GroupName":"","Tenancy":"default"},"PrivateDnsName":"ip-172-31-37-215.ap-northeast-1.compute.internal","PrivateIpAddress":"172.31.37.215","ProductCodes":[],"PublicDnsName":"ec2-3-112-203-97.ap-northeast-1.compute.amazonaws.com","PublicIpAddress":"3.112.203.97","State":{"Code":16,"Name":"running"},"StateTransitionReason":"","SubnetId":"subnet-9edc36d6","VpcId":"vpc-7f81a818","Architecture":"x86_64","BlockDeviceMappings":[{"DeviceName":"/dev/xvda","Ebs":{"AttachTime":"2019-06-10T01:30:18.000Z","DeleteOnTermination":true,"Status":"attached","VolumeId":"vol-0c8fa0eb0e8f5b385"}}],"ClientToken":"","EbsOptimized":false,"EnaSupport":true,"Hypervisor":"xen","ElasticGpuAssociations":[],"ElasticInferenceAcceleratorAssociations":[],"NetworkInterfaces":[{"Association":{"IpOwnerId":"amazon","PublicDnsName":"ec2-3-112-203-97.ap-northeast-1.compute.amazonaws.com","PublicIp":"3.112.203.97"},"Attachment":{"AttachTime":"2019-06-10T01:30:17.000Z","AttachmentId":"eni-attach-0889f88e35a2267f9","DeleteOnTermination":true,"DeviceIndex":0,"Status":"attached"},"Description":"","Groups":[{"GroupName":"default","GroupId":"sg-6594021a"}],"Ipv6Addresses":[],"MacAddress":"06:1c:1a:f7:e6:78","NetworkInterfaceId":"eni-0d8f29c56988c1b77","OwnerId":"664995898618","PrivateDnsName":"ip-172-31-37-215.ap-northeast-1.compute.internal","PrivateIpAddress":"172.31.37.215","PrivateIpAddresses":[{"Association":{"IpOwnerId":"amazon","PublicDnsName":"ec2-3-112-203-97.ap-northeast-1.compute.amazonaws.com","PublicIp":"3.112.203.97"},"Primary":true,"PrivateDnsName":"ip-172-31-37-215.ap-northeast-1.compute.internal","PrivateIpAddress":"172.31.37.215"}],"SourceDestCheck":true,"Status":"in-use","SubnetId":"subnet-9edc36d6","VpcId":"vpc-7f81a818","InterfaceType":"interface"}],"RootDeviceName":"/dev/xvda","RootDeviceType":"ebs","SecurityGroups":[{"GroupName":"default","GroupId":"sg-6594021a"}],"SourceDestCheck":true,"Tags":[{"Key":"Name","Value":"pepper"}],"VirtualizationType":"hvm","CpuOptions":{"CoreCount":1,"ThreadsPerCore":1},"CapacityReservationSpecification":{"CapacityReservationPreference":"open"},"HibernationOptions":{"Configured":false},"Licenses":[]}],"OwnerId":"664995898618","ReservationId":"r-0a21b5445fbd1a6ea"}]}
 */