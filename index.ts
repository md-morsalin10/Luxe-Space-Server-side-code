import { MongoClient, ServerApiVersion, ObjectId } from "mongodb"; // ObjectId ইমপোর্ট করুন
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";


dotenv.config();

const app = express();

app.use(cors());
app.use(cors({
    origin: process.env.FRONTEND_URL, 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uri = process.env.MONGO_URI || "";
const PORT = process.env.PORT || 5000;

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
        // await client.connect();

        const database = client.db("LuxeSpace");
        const userCollection = database.collection("user");
        const propertyCollection = database.collection("property");
        const paymentCollection = database.collection("payment");

        // API Route
        // post api to insert data into the property collection

        app.get("/api/features/properties", async (req: Request, res: Response) => {
            const query = {};
            const properties = await propertyCollection.find(query).limit(8).sort({ createdAt: -1 }).toArray();
            res.send(properties);
        })

        app.get("/api/payment", async (req: Request, res: Response) => {
            try {
                const query: any = {};

                if (req.query.userId) {
                    query["buyer.id"] = req.query.userId;
                }

                if (req.query.userEmail) {
                    query["buyer.email"] = req.query.userEmail;
                }
                if (req.query.sellerId) {
                    query["seller.id"] = req.query.sellerId;
                }

                const userPayment = await paymentCollection.find(query).toArray();

                res.status(200).json(userPayment);

            } catch (error: any) {
                console.error("Error fetching payments:", error);
                res.status(500).json({
                    message: "Internal server error while fetching payment history",
                    error: error.message
                });
            }
        });
        app.post("/api/payment", async (req: Request, res: Response) => {
            const { sessionId, propertyId, title, price, type, location, image, sellerId, sellerEmail, sellerName, buyerId, buyerEmail, buyerName } = req.body;

            try {

                if (!sessionId) {
                    return res.status(400).json({ message: "Session ID is required" });
                }

                const paymentData = {
                    sessionId,
                    propertyId,
                    title,
                    price: Number(price),
                    type,
                    location,
                    image,
                    seller: {
                        id: sellerId,
                        name: sellerName,
                        email: sellerEmail
                    },
                    buyer: {
                        id: buyerId,
                        name: buyerName,
                        email: buyerEmail
                    },
                    createdAt: new Date()
                };

                const updateResult = await propertyCollection.updateOne(
                    { _id: new ObjectId(propertyId) },
                    {
                        $set: {
                            status: "sold",
                            buyerEmail: buyerEmail,
                            buyerId: buyerId,
                            buyerName: buyerName
                        }
                    }
                );

                const result = await paymentCollection.insertOne(paymentData);
                res.status(201).json(result);
            } catch (error) {
                res.status(500).json({ message: "Error inserting payment data", error });
            }
        });

        app.post("/api/property", async (req: Request, res: Response) => {
            try {
                const propertyData = req.body;
                const result = await propertyCollection.insertOne(propertyData);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error inserting data", error });
            }
        });


        app.delete("/api/property/:id", async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ message: "Invalid property ID format" });
                }

                const query = { _id: new ObjectId(id) };

                const property = await propertyCollection.findOne(query);

                if (!property) {
                    return res.status(404).json({ message: "Property not found" });
                }

                if (property.status === "sold") {
                    return res.status(400).json({
                        message: "Action denied. Sold properties cannot be deleted from the system."
                    });
                }

                const result = await propertyCollection.deleteOne(query);

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: "Property successfully deleted", result });
                } else {
                    res.status(500).json({ message: "Failed to delete the property" });
                }

            } catch (error: any) {
                console.error("Error deleting property:", error);
                res.status(500).json({
                    message: "Internal server error while deleting property",
                    error: error.message
                });
            }
        });

    
        app.delete("/api/users/:id", async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ message: "Invalid user ID format" });
                }

                const query = { _id: new ObjectId(id) };

                const user = await userCollection.findOne(query);
                if (!user) {
                    return res.status(404).json({ message: "User not found" });
                }

            
                if (user.role === "admin") {
                    return res.status(403).json({ message: "Action denied. Admin accounts cannot be deleted." });
                }

               
                const result = await userCollection.deleteOne(query);

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: "User successfully deleted from the network database", result });
                } else {
                    res.status(500).json({ message: "Failed to delete the user" });
                }

            } catch (error: any) {
                console.error("Error deleting user:", error);
                res.status(500).json({
                    message: "Internal server error while deleting user",
                    error: error.message
                });
            }
        });
      

        // get single property by ID api
        app.get("/api/property/:id", async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid property ID format" });
                }

                const query = { _id: new ObjectId(id) };
                const property = await propertyCollection.findOne(query);

                if (!property) {
                    return res.status(404).send({ message: "Property not found" });
                }

                res.send(property);
            } catch (error) {
                res.status(500).send({ message: "Error fetching property details", error });
            }
        });

        app.get("/api/property", async (req: Request, res: Response) => {
            const query: Record<string, any> = {};

            if (req.query.sellerId) {
                query.sellerId = req.query.sellerId;
            }

            const properties = await propertyCollection.find(query).toArray();
            res.send(properties);
        });




        app.get("/api/users", async (req: Request, res: Response) => {
            try {
                const result = await userCollection.find().sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching data", error });
            }
        });

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error("Database connection error:", error);
    }

}
run().catch(console.dir);



app.get("/", (req: Request, res: Response) => {
    res.send("LuxeSpace Server Running");
});



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
