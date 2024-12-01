const dgram = require("node:dgram");
const dnsPacket = require("dns-packet");
const { MongoClient } = require("mongodb");
const NodeCache = require("node-cache");

// Create a new cache instance with a TTL of 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const server = dgram.createSocket("udp4");

const mongoUri = "mongodb://localhost:27017";
const client = new MongoClient(mongoUri);
const dbName = "dns_records";

// Utility function to get the TLD from the domain name
function getCollectionNameFromDomain(domain) {
  const parts = domain.split(".");
  return parts[parts.length - 1];
}

// Connect to MongoDB and get the DNS record
async function getDNSRecord(domain) {
  // Check if the record exists in the cache
  const cachedRecord = cache.get(domain);
  if (cachedRecord) {
    console.log(`Cache hit for ${domain}`);
    return cachedRecord;
  }

  // Cache miss: Fetch from MongoDB
  console.log(`Cache miss for ${domain}`);
  try {
    const collectionName = getCollectionNameFromDomain(domain);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const record = await collection.findOne({ name: domain });

    // Cache the record if found
    if (record) {
      cache.set(domain, record);
    }
    return record;
  } catch (err) {
    console.error("Error querying MongoDB:", err);
    return null;
  }
}

// Handle incoming DNS requests
server.on("message", async (msg, rinfo) => {
  const incomingReq = dnsPacket.decode(msg);
  const domain = incomingReq.questions[0].name;
  console.log(`Received query for ${domain}`);

  // Fetch the DNS record (from cache or MongoDB)
  const record = await getDNSRecord(domain);

  // Validate the fetched record
  if (!record || !record.type) {
    console.log(`No valid record found for ${domain}`);
    sendNotFoundResponse(incomingReq, rinfo);
    return;
  }

  let answer;
  switch (record.type.toUpperCase()) {
    case "TXT":
      // Ensure the text field is valid
      if (typeof record.text !== "string" || !record.text.trim()) {
        console.error(`Invalid or missing 'text' field for TXT record of ${record.name}: ${record.text}`);
        sendNotFoundResponse(incomingReq, rinfo);
        return;
      }
      answer = {
        type: "TXT",
        class: "IN",
        name: record.name,
        data: record.text,
      };
      break;

    case "AAAA":
      // Ensure the IP is valid for 'AAAA' record (IPv6 address)
      answer = {
        type: "AAAA",
        class: "IN",
        name: record.name,
        data: record.ip,
      };
      break;

    case "A":
      // Ensure the IP is valid for 'A' record
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(record.ip)) {
        console.error(`Invalid IP address format for ${domain}: ${record.ip}`);
        sendNotFoundResponse(incomingReq, rinfo);
        return;
      }
      answer = {
        type: "A",
        class: "IN",
        name: record.name,
        data: record.ip,
      };
      break;

    case "CNAME":
      // Handle CNAME records
      answer = {
        type: "CNAME",
        class: "IN",
        name: record.name,
        data: record.alias, // The alias domain, e.g., 'target.example.com'
      };
      break;

    case "NS":
      // Handle NS records
      answer = {
        type: "NS",
        class: "IN",
        name: record.name,
        data: record.nameserver, // The name server, e.g., 'ns1.example.com'
      };
      break;

    default:
      console.log(`Unsupported record type: ${record.type}`);
      sendNotFoundResponse(incomingReq, rinfo);
      return;
  }

  // Prepare the DNS response
  const ans = dnsPacket.encode({
    type: "response",
    id: incomingReq.id,
    flags: dnsPacket.AUTHORITATIVE_ANSWER,
    questions: incomingReq.questions,
    answers: [answer],
  });

  // Send the response to the client
  server.send(ans, rinfo.port, rinfo.address, (err) => {
    if (err) console.error("Error sending response:", err);
    else console.log(`Sent ${record.type} response for ${domain}`);
  });
});

// Send 'Not Found' response if no valid record is found
function sendNotFoundResponse(incomingReq, rinfo) {
  const notFoundAns = dnsPacket.encode({
    type: "response",
    id: incomingReq.id,
    flags: dnsPacket.AUTHORITATIVE_ANSWER,
    questions: incomingReq.questions,
    answers: [],
  });

  server.send(notFoundAns, rinfo.port, rinfo.address, (err) => {
    sleep(3000);
    if (err) console.error("Error sending Not Found response:", err);
    else console.log(`Sent Not Found response for ${incomingReq.questions[0].name}`);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// Start the DNS server
server.bind(69, () => {
  console.log("DNS Server is running on port 69");

  // Connect to MongoDB on server start
  client.connect()
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
    });
});

// const dgram = require("node:dgram");
// const dnsPacket = require("dns-packet");
// const { MongoClient } = require("mongodb");
// const NodeCache = require("node-cache");

// // Create a new cache instance with a TTL of 5 minutes (300 seconds)
// const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// const server = dgram.createSocket("udp4");

// const mongoUri = "mongodb://localhost:27017";
// const client = new MongoClient(mongoUri);
// const dbName = "dns_records";

// // Utility function to get the TLD from the domain name
// function getCollectionNameFromDomain(domain) {
//   const parts = domain.split(".");
//   return parts[parts.length - 1];
// }

// // Recursive DNS resolution function
// async function resolveRecord(domain, type) {
//   const record = await getDNSRecord(domain, type);
//   if (!record) return null;

//   // Handle CNAME recursively
//   if (record.type === "CNAME") {
//     console.log(`Resolving CNAME target: ${record.target}`);
//     return resolveRecord(record.target, "A"); // Resolve CNAME to an A record
//   }

//   // Handle NS recursively (find the IP of the nameserver)
//   if (record.type === "NS") {
//     console.log(`Resolving NS target: ${record.target}`);
//     return resolveRecord(record.target, "A"); // Resolve NS to an A record
//   }

//   return record;
// }

// // Connect to MongoDB and get the DNS record by name and type
// async function getDNSRecord(domain, type) {
//   // Check if the record exists in the cache
//   const cacheKey = `${domain}_${type}`;
//   const cachedRecord = cache.get(cacheKey);
//   if (cachedRecord) {
//     console.log(`Cache hit for ${cacheKey}`);
//     return cachedRecord;
//   }

//   // Cache miss: Fetch from MongoDB
//   console.log(`Cache miss for ${cacheKey}`);
//   try {
//     const collectionName = getCollectionNameFromDomain(domain);
//     const db = client.db(dbName);
//     const collection = db.collection(collectionName);
//     const record = await collection.findOne({ name: domain, type });

//     // Cache the record if found
//     if (record) {
//       cache.set(cacheKey, record);
//     }
//     return record;
//   } catch (err) {
//     console.error("Error querying MongoDB:", err);
//     return null;
//   }
// }

// // Handle incoming DNS requests
// server.on("message", async (msg, rinfo) => {
//   const incomingReq = dnsPacket.decode(msg);
//   const domain = incomingReq.questions[0].name;
//   const type = incomingReq.questions[0].type.toUpperCase();
//   console.log(`Received query for ${domain} (type ${type})`);

//   // Resolve the DNS record
//   const record = await resolveRecord(domain, type);

//   // Validate the fetched record
//   if (!record) {
//     console.log(`No valid record found for ${domain}`);
//     sendNotFoundResponse(incomingReq, rinfo);
//     return;
//   }

//   // Prepare the DNS response
//   const ans = dnsPacket.encode({
//     type: "response",
//     id: incomingReq.id,
//     flags: dnsPacket.AUTHORITATIVE_ANSWER,
//     questions: incomingReq.questions,
//     answers: [
//       {
//         type: record.type.toUpperCase(),
//         class: "IN",
//         name: record.name,
//         data: record.target || record.ip || record.text,
//         priority: record.priority || undefined,
//       },
//     ],
//   });

//   // Send the response to the client
//   server.send(ans, rinfo.port, rinfo.address, (err) => {
//     if (err) console.error("Error sending response:", err);
//     else console.log(`Sent response for ${domain}: ${record.target || record.ip}`);
//   });
// });

// // Send 'Not Found' response if no valid record is found
// function sendNotFoundResponse(incomingReq, rinfo) {
//   const notFoundAns = dnsPacket.encode({
//     type: "response",
//     id: incomingReq.id,
//     flags: dnsPacket.AUTHORITATIVE_ANSWER,
//     questions: incomingReq.questions,
//     answers: [],
//   });

//   server.send(notFoundAns, rinfo.port, rinfo.address, (err) => {
//     if (err) console.error("Error sending Not Found response:", err);
//     else console.log(`Sent Not Found response for ${incomingReq.questions[0].name}`);
//   });
// }

// // Start the DNS server
// server.bind(69, () => {
//   console.log("DNS Server is running on port 69");

//   // Connect to MongoDB on server start
//   client.connect()
//     .then(() => {
//       console.log("Connected to MongoDB");
//     })
//     .catch((err) => {
//       console.error("MongoDB connection error:", err);
//     });
// });