
import { PublicHostedZone, ZoneDelegationRecord } from '@aws-cdk/aws-route53';
import { Stack, Construct, StackProps } from '@aws-cdk/core';


interface ProcessEnv extends Dict<string> {}

interface Dict<T> {
  [key: string]: T | undefined;
}

// DNS_PROD=ns-1494.awsdns-58.org,ns-623.awsdns-13.net,ns-99.awsdns-12.com,ns-1661.awsdns-15.co.uk
// { domain: [ 'PROD' ], NS: '234,42,2' }
// return list of ENV vars that start with DNS_
var parseEnvVars = function(obj: ProcessEnv, filter: RegExp) {
  var key, keys = [];
  for (key in obj) {
      if (obj.hasOwnProperty(key) && filter.test(key)) {
        console.log('Domain and keys', key)
        keys.push({'domain': key.split("_")[1], NS: obj[key]?.split(',') || ['undefined']});
      }
  }
  console.log('Return keys', keys)
  return keys;
}

export class DelegationStack extends Stack {
  
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const zone = PublicHostedZone.fromLookup(this, 'zone', {
      domainName: "naumenko.ca"
    });

    // read nameservers from env variables, named DNS_NS_DEV, DNS_NS_XXX where xxx is the subdomain name 
    for (let record of parseEnvVars(process.env, new RegExp('^DNS_'))) {
      console.log('Found NS record: ', record)
      new ZoneDelegationRecord(this, record.domain, {
        zone: zone,
        recordName: record.domain.toLowerCase(),
        nameServers: record.NS,
        comment: 'Created from cdk for ' + record.domain,
      })
    }
  }
}