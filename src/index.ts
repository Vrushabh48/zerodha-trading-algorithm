import express from "express";
import bodyParser from "body-parser";

export const app = express();

app.use(bodyParser({}));

interface Balances{
    [key: string]: number;
}

interface User{
    id: string,
    balances: Balances
}

interface Order{
    userId: string,
    price: number,
    quantity: number
}
//Ticker is the assest we are trading. Here we are tradiing the TATA stock. The ticker can also be an array which contain multiple stocks
export const TICKER = "TATA";

const users: User[] = [{
    id: "1",
    balances: {
        "TATA": 10,
        "USD": 50000
    }
},{
    id: "2",
    balances:{
        "TATA": 10,
        "USD": 50000
    }
}]

const bids: Order[] = [];
const asks: Order[] = [];

app.post('/order', (req: any, res: any) => {
    const side: string = req.body.side; // side refers to: bid or ask
    const price: number = req.body.price;
    const quantity: number = req.body.quantity;
    const userId: string = req.body.userId;

    const remainingQTY = fillOrders(side, price, quantity, userId);
    
    if(remainingQTY === 0){
        res.json({fillQuantity: quantity});
        return;
    }

    if(side === "bid"){
        bids.push({
            userId,
            price,
            quantity: remainingQTY
        });
        bids.sort((a,b) => a.price < b.price ? 1 : -1);
    } else{
        asks.push({
            userId,
            price,
            quantity: remainingQTY
        })
        asks.sort((a,b) => a.price < b.price ? -1 : 1);
    }

    res.json({
        filledQuantity: quantity - remainingQTY
    });
})

app.get('/depth', (req: any, res: any) => {
    const depth: {
        [price: string]:{
            type: "bid" | "ask",
            quantity: number
        }
    } = {};

    for(let i = 0; i < bids.length; i++){
        if(!depth[bids[i].price]){
            depth[bids[i].price]  = {
                quantity: bids[i].quantity,
                type: "bid"
            };
        } else {
            depth[bids[i].price].quantity += bids[i].quantity;
        }
    }

    for(let i = 0; i < asks.length; i++){
        if(!depth[asks[i].price]){
            depth[asks[i].price] = {
                quantity: asks[i].quantity,
                type: "ask"
            }
        } else {
            depth[asks[i].price].quantity += asks[i].quantity;
        }
    }

    res.json({
        depth
    })
})

app.get('/balance/:userId', (req:any, res: any) => {
    const userId = req.params.userId;
    const user = users.find(x => x.id === userId);
    if(!user){
        return res.json({
            USD: 0,
            [TICKER]: 0
        })
    }
    res.json({balances: user.balances});
})

function flipBalance(userId1: string, userId2: string, quantity: number, price: number) {
    let user1 = users.find(x => x.id === userId1);
    let user2 = users.find(x => x.id === userId2);
    if (!user1 || !user2) {
      return;
    }
    user1.balances[TICKER] -= quantity;
    user2.balances[TICKER] += quantity;
    user1.balances["USD"] += (quantity * price);
    user2.balances["USD"] -= (quantity * price);
  }

function fillOrders(side: string, price: number, quantity: number, userId: string): number {
    let remainingQuantity = quantity;
    if (side === "bid") {
      for (let i = asks.length - 1; i >= 0; i--) {
        if (asks[i].price > price) {
          continue;
        }
        if (asks[i].quantity > remainingQuantity) {
          asks[i].quantity -= remainingQuantity;
          flipBalance(asks[i].userId, userId, remainingQuantity, asks[i].price);
          return 0;
        } else {
          remainingQuantity -= asks[i].quantity;
          flipBalance(asks[i].userId, userId, asks[i].quantity, asks[i].price);
          asks.pop();
        }
      }
    } else {
      for (let i = bids.length - 1; i >= 0; i--) {
        if (bids[i].price < price) {
          continue;
        }
        if (bids[i].quantity > remainingQuantity) {
          bids[i].quantity -= remainingQuantity;
          flipBalance(userId, bids[i].userId, remainingQuantity, price);
          return 0;
        } else {
          remainingQuantity -= bids[i].quantity;
          flipBalance(userId, bids[i].userId, bids[i].quantity, price);
          bids.pop();
        }
      }
    }
  
    return remainingQuantity;
  }