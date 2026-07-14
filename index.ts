import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb"; // TypeScript standard import

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uri = process.env.MONGO_URI || "";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server
        await client.connect();

        const database = client.db("LuxeSpace");
        const userCollection = database.collection("user");
        const propertyCollection = database.collection("property");

        // API Route
        // post api to insert data into the property collection
        app.post("/api/property", async (req: Request, res: Response) => {
            try {
                const propertyData = req.body;
                const result = await propertyCollection.insertOne(propertyData);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error inserting data", error });
            }
        });


        // get api 
        app.get("/api/property", async (req: Request, res: Response) => {
            const query: Record<string, any> = {};

            if (req.query.sellerId) {
                query.sellerId = req.query.sellerId;
            }

            const properties = await propertyCollection.find(query).toArray();
            res.send(properties);
        });




        app.get("/api/user", async (req: Request, res: Response) => {
            try {
                const result = await userCollection.find().sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching data", error });
            }
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error("Database connection error:", error);
    }

}
run().catch(console.dir);

app.get("/", (req: Request, res: Response) => {
    res.send("LuxeSpace Server Running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});