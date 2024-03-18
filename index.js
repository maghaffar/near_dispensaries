const axios = require("axios");
const firebase = require("firebase-admin");
const serviceAccount = require("./herb-firebase-admin.json");

// Initialize firebase admin
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
});
const firebaseAdminSdk = firebase.firestore();

const nearDispArray = [];
async function getDispFromFirebase() {
  const nearDispRef = await firebaseAdminSdk
    .collection("nearby_dispensaries")
    .get();
  nearDispRef.forEach((doc) => {
    nearDispArray.push(doc.data());
  });

  await getDispensaries();
}
getDispFromFirebase();

let data;
async function getDispensaries() {
  const config = {
    method: "post",
    url: "http://herb-admin-prod.fyawmqztqy.us-east-1.elasticbeanstalk.com/graphql",
    data: {
      query: `query MyQuery {
                  dispensaries(first: 1) {
                    edges {
                      node {
                        slug
                        databaseId
                      }
                    }
                    pageInfo{
                        endCursor
                        hasNextPage
                      }
                  }
                }
                `,
    },
  };

  const response = await axios.request(config);
  data = await response.data.data;

  data.dispensaries.edges.forEach((disp) => {
    const responseDisp = nearDispArray.filter(
      (data) => data?.nearDispensaries[0]?.origin === disp.node.slug
    );
    const id = disp.node.databaseId;
    const dispArray = JSON.stringify(responseDisp);
    console.log(id, dispArray);
    update(id, dispArray);
  });
}

async function update(id, dispArray) {
  let data = {
    nearDispensaries: dispArray,
  };

  const config = {
    method: "post",
    url: `http://herb-admin-prod.fyawmqztqy.us-east-1.elasticbeanstalk.com/wp-json/wp/v2/dispensary/${id}`,
    headers: {
      Authorization:
        "Basic SHVzc25haW46dEVVYyBKaXNvIEVGaDcgVktGciBuMENaIGc1OFQ=",
    },
    data: data,
  };

  const response = await axios.request(config);
  console.log(
    "Post updated successfully:",
    response.data.id,
    response.data.nearDispensaries
  );
}
