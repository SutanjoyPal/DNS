// const dnsPacket = require("dns-packet");
// const dgram = require("dgram");
// const readline = require("readline");

// // Setup the readline interface to take user input
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

// const client = dgram.createSocket("udp4");

// // Function to send DNS query
// function sendDnsQuery(domain, type) {
//   const message = dnsPacket.encode({
//     type: "query",
//     id: 1,
//     flags: dnsPacket.RECURSION_DESIRED,
//     questions: [{ type: type.toUpperCase(), name: domain }],
//   });

//   client.send(message, 0, message.length, 69, "localhost", (err) => {
//     if (err) console.error("Error sending DNS query:", err);
//   });
// }

// // Event listener for the DNS response
// client.on("message", (response) => {
//   const decoded = dnsPacket.decode(response);
//   const answer = decoded.answers[0];

//   if (answer && answer.data) {
//     console.log(`Received response for ${decoded.questions[0].name} (${answer.type}): ${answer.data}`);
//   } else {
//     console.log(`Not found: ${decoded.questions[0].name}`);
//   }

//   // Prompt for the next domain after receiving the response
//   promptForDomainAndType();
// });

// // Function to prompt the user for domain and type input
// function promptForDomainAndType() {
//   rl.question("Enter the domain name to query (or '-1' to stop): ", (domain) => {
//     if (domain === "-1") {
//       console.log("Exiting...");
//       rl.close(); // Close the readline interface
//       return;
//     }

//     rl.question("Enter the record type (A, CNAME, NS, etc.): ", (type) => {
//       if (type.toUpperCase() === "-1") {
//         console.log("Exiting...");
//         rl.close(); // Close the readline interface
//         return;
//       }
      
//       if (!["A", "CNAME", "NS"].includes(type.toUpperCase())) {
//         console.log("Invalid record type. Please enter A, CNAME, or NS.");
//         promptForDomainAndType(); // Prompt again if type is invalid
//         return;
//       }

//       // Send DNS query with the specified domain and type
//       sendDnsQuery(domain, type);
//     });
//   });
// }

// // Start the prompting loop
// promptForDomainAndType();

const dnsPacket = require("dns-packet");
const dgram = require("dgram");
const readline = require("readline");

// Setup the readline interface to take user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const client = dgram.createSocket("udp4");

// Supported record types
const SUPPORTED_RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT"];

// Function to send DNS query
function sendDnsQuery(domain, type) {
  const message = dnsPacket.encode({
    type: "query",
    id: 1,
    flags: dnsPacket.RECURSION_DESIRED,
    questions: [{ type: type.toUpperCase(), name: domain }],
  });

  client.send(message, 0, message.length, 69, "localhost", (err) => {
    if (err) console.error("Error sending DNS query:", err);
  });
}

// Event listener for the DNS response
client.on("message", (response) => {
  const decoded = dnsPacket.decode(response);
  const question = decoded.questions[0];
  const answers = decoded.answers;

  if (answers && answers.length > 0) {
    console.log(`Received response for ${question.name} (${question.type}):`);
    answers.forEach((answer) => {
      console.log(`  - ${answer.type}: ${answer.data}`);
    });
  } else {
    console.log(`No records found for ${question.name} (${question.type})`);
  }

  // Prompt for the next domain after receiving the response
  promptForDomainAndType();
});

// Function to prompt the user for domain and type input
function promptForDomainAndType() {
  rl.question("Enter the domain name to query (or '-1' to stop): ", (domain) => {
    if (domain === "-1") {
      console.log("Exiting...");
      rl.close(); // Close the readline interface
      return;
    }

    rl.question("Enter the record type (A, AAAA, CNAME, MX, NS, TXT): ", (type) => {
      if (type.toUpperCase() === "-1") {
        console.log("Exiting...");
        rl.close(); // Close the readline interface
        return;
      }

      if (!SUPPORTED_RECORD_TYPES.includes(type.toUpperCase())) {
        console.log(`Invalid record type. Supported types: ${SUPPORTED_RECORD_TYPES.join(", ")}`);
        promptForDomainAndType(); // Prompt again if type is invalid
        return;
      }

      // Send DNS query with the specified domain and type
      sendDnsQuery(domain, type);
    });
  });
}

// Start the prompting loop
promptForDomainAndType();

