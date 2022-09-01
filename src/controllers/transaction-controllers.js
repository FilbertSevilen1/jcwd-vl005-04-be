const { adminLoginSchema, adminSendForgetSchema, adminResetPasswordSchema, addAdminSchema } = require("../helpers/schema-validation")
const database = require("../config").promise()
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const puppeteer = require('puppeteer');

module.exports.getTransactions = async(req,res) =>{
    const limit = Number(req.query._limit) || 5
    const page = Number(req.query._page) || 1
    const order = req.query._sortDate || "DESC"
    let filter = req.query._filterDate || "All"
    const currDate = new Date();

    const customDateStart = 1;
    const customMonthStart = req.query._filterCustomMonthStart || (currDate.getMonth()+1).toString();
    const customYearStart = req.query._filterCustomYearStart || currDate.getDate().toString();

    const customMonthEnd = req.query._filterCustomMonthEnd || (currDate.getMonth()+1).toString();
    const customYearEnd = req.query._filterCustomYearEnd || currDate.getDate().toString();
    let customDateEnd;

    if(filter == "Custom" && req.query._filterCustomMonthStart == undefined){
        filter = "All"
    }

    if(customMonthEnd==4||customMonthEnd==6||customMonthEnd==9||customMonthEnd==11){
        customDateEnd=30;
    }
    else if(customMonthEnd==2){
        customDateEnd=28;
    }
    else customDateEnd=31;

    const offset = (page - 1) * limit

    let date = currDate.getDate().toString();
    let month = (currDate.getMonth()+1).toString();
    let year = currDate.getFullYear().toString();

    try{
        let GET_TRANSACTIONS;
        let GET_TOTAL;
        switch(filter){
            case "Custom":
                GET_TRANSACTIONS = `
                SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id 
                FROM transactions 
                WHERE DATEDIFF("${customYearEnd}-${customMonthEnd}-${customDateEnd}", created_at) >= 0 && DATEDIFF("${customYearStart}-${customMonthStart}-${customDateStart}", created_at) <= 0
                ORDER BY created_at ${order} 
                LIMIT ${database.escape(offset)}, ${database.escape(limit)}`;

                GET_TOTAL = `SELECT COUNT(*) AS total FROM transactions WHERE DATEDIFF("${customYearEnd}-${customMonthEnd}-${customDateEnd}", created_at) >= 0 && DATEDIFF("${customYearStart}-${customMonthStart}-${customDateStart}", created_at) <= 0`;
                break;
            case "Week":
                GET_TRANSACTIONS = `
                SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id 
                FROM transactions 
                WHERE DATEDIFF("${year}-${month}-${date}", created_at) <= 7
                ORDER BY created_at ${order} 
                LIMIT ${database.escape(offset)}, ${database.escape(limit)}`;

                GET_TOTAL = `SELECT COUNT(*) AS total FROM transactions WHERE DATEDIFF("${year}-${month}-${date}", created_at) <= 7`;
            break;
            
            case "Month":
                GET_TRANSACTIONS = `
                SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id 
                FROM transactions 
                WHERE DATEDIFF("${year}-${month}-${date}", created_at) <= 30
                ORDER BY created_at ${order} 
                LIMIT ${database.escape(offset)}, ${database.escape(limit)}`;

                GET_TOTAL = `SELECT COUNT(*) AS total FROM transactions WHERE DATEDIFF("${year}-${month}-${date}", created_at) <= 30`;
            break;

            case "Year":
                GET_TRANSACTIONS = `
                SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id 
                FROM transactions 
                WHERE DATEDIFF("${year}-${month}-${date}", created_at) <= 365
                ORDER BY created_at ${order} 
                LIMIT ${database.escape(offset)}, ${database.escape(limit)}`;
                
                GET_TOTAL = `SELECT COUNT(*) AS total FROM transactions WHERE DATEDIFF("${year}-${month}-${date}", created_at) <= 365`;
            break;

            default:
            GET_TRANSACTIONS = `
            SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id 
            FROM transactions 
            ORDER BY created_at ${order} 
            LIMIT ${database.escape(offset)}, ${database.escape(limit)}`;
            GET_TOTAL = `SELECT COUNT(*) AS total FROM transactions`;
        }     

        let [TRANSACTIONS] = await database.execute(GET_TRANSACTIONS)
        let [TOTAL] = await database.execute(GET_TOTAL, [order])
        const data = {
            transaction : TRANSACTIONS,
            total : TOTAL[0].total
        }

        res.status(200).send(data)
    }
    catch(error){
        console.log('error : ',error);
        res.status(500).send('Internal service error')
    }
}

module.exports.getTransactionsByUserId = async(req,res) =>{
    const id = req.params.userid
    const limit = Number(req.query._limit) || 5
    const page = Number(req.query._page) || 1
    const order = req.query._sortDate || "DESC"
    let filter = req.query._filterDate || "All"
    const offset = (page - 1) * limit

    const currDate = new Date();

    const customDateStart = 1;
    const customMonthStart = req.query._filterCustomMonthStart || (currDate.getMonth()+1).toString();
    const customYearStart = req.query._filterCustomYearStart || currDate.getDate().toString();

    const customMonthEnd = req.query._filterCustomMonthEnd || (currDate.getMonth()+1).toString();
    const customYearEnd = req.query._filterCustomYearEnd || currDate.getDate().toString();
    let customDateEnd;

    if(filter == "Custom"&& req.query._filterCustomMonthStart == undefined){
        filter = "All"
    }

    if(customMonthEnd==4||customMonthEnd==6||customMonthEnd==9||customMonthEnd==11){
        customDateEnd=30;
    }
    else if(customMonthEnd==2){
        customDateEnd=28;
    }
    else customDateEnd=31;

    let date = currDate.getDate().toString();
    let month = (currDate.getMonth()+1).toString();
    let year = currDate.getFullYear().toString();

    try{
        let GET_TRANSACTIONS;
        let GET_TOTAL;
        
        switch(filter){
            case "Custom":
                GET_TRANSACTIONS = `
                SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id 
                FROM transactions 
                WHERE user_id=? && DATEDIFF("${customYearEnd}-${customMonthEnd}-${customDateEnd}", created_at) >= 0 && DATEDIFF("${customYearStart}-${customMonthStart}-${customDateStart}", created_at) <= 0
                ORDER BY created_at ${order} 
                LIMIT ${database.escape(offset)}, ${database.escape(limit)}`;
                GET_TOTAL = `SELECT COUNT(*) AS total FROM transactions WHERE user_id=? && DATEDIFF("${customYearEnd}-${customMonthEnd}-${customDateEnd}", created_at) >= 0 && DATEDIFF("${customYearStart}-${customMonthStart}-${customDateStart}", created_at) <= 0`;
                break;

            case "Week":
                GET_TRANSACTIONS = `
                SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id 
                FROM transactions 
                WHERE user_id=? && DATEDIFF("${year}-${month}-${date}", created_at) <= 7
                ORDER BY created_at ${order} 
                LIMIT ${database.escape(offset)}, ${database.escape(limit)}`;
                GET_TOTAL = `SELECT COUNT(*) AS total FROM transactions WHERE user_id=? && DATEDIFF("${year}-${month}-${date}", created_at) <= 7`;
            break;
            
            case "Month":
                GET_TRANSACTIONS = `
                SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id 
                FROM transactions 
                WHERE user_id=? && DATEDIFF("${year}-${month}-${date}", created_at) <= 30
                ORDER BY created_at ${order} 
                LIMIT ${database.escape(offset)}, ${database.escape(limit)}`;
                GET_TOTAL = `SELECT COUNT(*) AS total FROM transactions WHERE user_id=? && DATEDIFF("${year}-${month}-${date}", created_at) <= 30`;
            break;

            case "Year":
                GET_TRANSACTIONS = `
                SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id 
                FROM transactions 
                WHERE user_id=? && DATEDIFF("${year}-${month}-${date}", created_at) <= 365
                ORDER BY created_at ${order} 
                LIMIT ${database.escape(offset)}, ${database.escape(limit)}`;
                GET_TOTAL = `SELECT COUNT(*) AS total FROM transactions WHERE user_id=? && DATEDIFF("${year}-${month}-${date}", created_at) <= 365`;
            break;

            default:
            GET_TRANSACTIONS = `
            SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id 
            FROM transactions 
            WHERE user_id=? 
            ORDER BY created_at ${order} 
            LIMIT ${database.escape(offset)}, ${database.escape(limit)}`;
            GET_TOTAL = `SELECT COUNT(*) AS total FROM transactions WHERE user_id=?`;
        }
    
        let [TRANSACTIONS] = await database.execute(GET_TRANSACTIONS, [id])

        
        let [TOTAL] = await database.execute(GET_TOTAL, [id])
        const data = {
            transaction : TRANSACTIONS,
            total : TOTAL[0].total
        }

        res.status(200).send(data)
    }
    catch(error){
        console.log('error : ',error);
        res.status(500).send('Internal service error')
    }
}

module.exports.approveTransaction = async(req,res) =>{
    const id = req.params.id
    const user_id = req.body.user_id
    console.log(user_id)
    try{
        const APPROVE_TRANSACTION = `UPDATE transactions SET status = 'approved' WHERE id = ?`
        const [INFO] = await database.execute(APPROVE_TRANSACTION, [id]);

        const GET_USER_EMAIL = `SELECT * FROM users WHERE id = ?`
        const [USER] = await database.execute(GET_USER_EMAIL, [user_id])
        const email = USER[0].email
        
        const GET_TRANSACTION_DATA = `SELECT * FROM transactions WHERE id = ?`
        const [TRANSACTION] = await database.execute(GET_TRANSACTION_DATA, [id]);

        // const GET_TRANSACTION_DETAILS = `
        // SELECT * FROM transaction_items 
        // JOIN products ON transaction_items.product_id = products.id 
        // JOIN product_units ON product_units.id = products.product_unit_id
        // WHERE transaction_id = ?`
        const GET_TRANSACTION_DETAILS = `
        SELECT * FROM transaction_items 
        JOIN products ON transaction_items.product_id = products.id 
        JOIN product_units ON product_units.id = products.product_unit_id
        WHERE transaction_id = ?`
        const [TRANSACTIONDETAILS] = await database.execute(GET_TRANSACTION_DETAILS, [id]);

        console.log(TRANSACTIONDETAILS)

        let details = "";
        let count = 0;
        TRANSACTIONDETAILS.forEach(item => {
            count++;
            details += `
                <tr style = "border: 1px solid black; border-collapse: collapse;">
                    <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                        ${count}
                    </td>
                    <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                        ${item.product_id}
                    </td>
                    <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                        ${item.volume}
                    </td>
                    <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                        Rp. ${item.price}
                    </td>
                </tr>
            `
        });
        
        const transaction = TRANSACTION[0]

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`http://localhost:3000/invoice/${transaction.inv_number}`);
        await page.screenshot({path: `public/${transaction.inv_number}.png`});
      
        await browser.close();

        const transporter = nodemailer.createTransport({
            service : 'gmail',
            auth : {
                user : `${email}`,
                pass : "nyxbegqqntyfvbob"
            },
            tls : { rejectUnauthorized : false }
        })

        await transporter.sendMail({
            from : '<admin/> sevilenfilbert@gmail.com',
            to : `${email}`,
            subject : 'Pharmacy Transaction Invoice',
            html : `
                <body>
                    <h1>Pharmacy Invoice ${transaction.inv_number}</h1>
                    <p>Thank you for Purchasing from our store! Here are the details of the transaction.</p>
                    <table style = "border: 1px solid black; border-collapse: collapse;">
                        <tr style = "border: 1px solid black; border-collapse: collapse;">
                            <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                Invoice Number
                            </th>
                            <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                Transaction Status
                            </th>
                            <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                Created At
                            </th>
                            <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                Total Payment
                            </th>
                        </tr style = "border: 1px solid black; border-collapse: collapse;">
                        <tr>
                            <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                ${transaction.inv_number}
                            </td>
                            <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                ${transaction.status}
                            </td>
                            <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                ${transaction.created_at}
                            </td>
                            <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                Rp. ${transaction.total_payment}
                            </td>
                        </tr>
                    </table>
                    <h1>Details</h1>

                    <table style = "border: 1px solid black; border-collapse: collapse;">
                        <thead>
                            <tr style = "border: 1px solid black; border-collapse: collapse;">
                                <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                    No.
                                </th>
                                <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                    Product Id
                                </th>
                                <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                    Volume
                                </th>
                                <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                    Price
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${details}
                        </tbody>
                    </table>

                    <p><a href="http://localhost:3000/invoice/${transaction.inv_number}">View Invoice Here</a></p>
                    <a href="http://localhost:5000/${transaction.inv_number}.png">View as Png</a>
                    <p>Contact Us : +62 7777 7777 777</p>
                    <p>WhatsApp : +62 7777 7777 777</p>
                    <p>Instagram : <a href="https://www.instagram.com">Check our instagram page here</a></p>
                </body>
            `
        })
        res.status(200).send("Email Sent")
    }
    catch(error){
        console.log('error : ',error);
        res.status(500).send('Internal service error')
    }
}

module.exports.getTransactionDetailByInvoiceId = async(req,res)=>{
    const id = req.params.id
    try{
        const GET_TRANSACTION = `
        SELECT * FROM transaction_items 
        JOIN products ON transaction_items.product_id = products.id 
        JOIN transactions ON transactions.id = transaction_items.transaction_id
        JOIN users ON users.id = transactions.user_id
        JOIN product_units ON product_units.id = products.product_unit_id
        WHERE transactions.inv_number = ?`
        const [TRANSACTION] = await database.execute(GET_TRANSACTION, [id]);
        res.status(200).send(TRANSACTION)
    }
    catch(error){
        console.log('error : ',error);
        res.status(500).send('Internal service error')
    }
}

module.exports.getTransactionByInvoiceId = async(req,res)=>{
    const id = req.params.id
    try{
        const GET_TRANSACTION = `
        SELECT id,user_id,inv_number,status, convert(created_at, CHAR) AS created_at, payment_proof_path, total_payment, address_id FROM transactions WHERE inv_number = ?`
        const [TRANSACTION] = await database.execute(GET_TRANSACTION, [id]);
        res.status(200).send(TRANSACTION[0])
    }
    catch(error){
        console.log('error : ',error);
        res.status(500).send('Internal service error')
    }
}

module.exports.rejectTransaction = async(req,res) =>{
    const id = req.params.id
    const user_id = req.body.user_id
    console.log(user_id)
    try{
        const APPROVE_TRANSACTION = `UPDATE transactions SET status = 'rejected' WHERE id = ?`
        const [INFO] = await database.execute(APPROVE_TRANSACTION, [id]);

        const GET_USER_EMAIL = `SELECT * FROM users WHERE id = ?`
        const [USER] = await database.execute(GET_USER_EMAIL, [user_id])
        const email = USER[0].email
        
        const GET_TRANSACTION_DATA = `SELECT * FROM transactions WHERE id = ?`
        const [TRANSACTION] = await database.execute(GET_TRANSACTION_DATA, [id]);

        const GET_TRANSACTION_DETAILS = `
        SELECT * FROM transaction_items 
        JOIN products ON transaction_items.product_id = products.id 
        JOIN product_units ON product_units.id = products.product_unit_id
        WHERE transaction_id = ?`
        const [TRANSACTIONDETAILS] = await database.execute(GET_TRANSACTION_DETAILS, [id]);

        let details = "";
        let count = 0;
        TRANSACTIONDETAILS.forEach(item => {
            count++;
            details += `
                <tr style = "border: 1px solid black; border-collapse: collapse;">
                    <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                        ${count}
                    </td>
                    <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                        ${item.product_id}
                    </td>
                    <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                        ${item.volume}
                    </td>
                    <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                        Rp. ${item.price}
                    </td>
                </tr>
            `
        });
        

        const transaction = TRANSACTION[0]

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`http://localhost:3000/invoice/${transaction.inv_number}`);
        await page.screenshot({path: `public/${transaction.inv_number}.png`});
      
        await browser.close();

        const transporter = nodemailer.createTransport({
            service : 'gmail',
            auth : {
                user : `${email}`,
                pass : "nyxbegqqntyfvbob"
            },
            tls : { rejectUnauthorized : false }
        })

        await transporter.sendMail({
            from : '<admin/> sevilenfilbert@gmail.com',
            to : `${email}`,
            subject : 'Pharmacy Transaction Rejected',
            html : `
                <body>
                    <h1>Your Pharmacy Transaction has been rejected.</h1>
                    <table style = "border: 1px solid black; border-collapse: collapse;">
                        <tr style = "border: 1px solid black; border-collapse: collapse;">
                            <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                Invoice Number
                            </th>
                            <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                Transaction Status
                            </th>
                            <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                Created At
                            </th>
                            <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                Total Payment
                            </th>
                        </tr style = "border: 1px solid black; border-collapse: collapse;">
                        <tr>
                            <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                ${transaction.inv_number}
                            </td>
                            <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                ${transaction.status}
                            </td>
                            <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                ${transaction.created_at}
                            </td>
                            <td style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                ${transaction.total_payment}
                            </td>
                        </tr>
                    </table>

                    <h1>Details</h1>

                    <table style = "border: 1px solid black; border-collapse: collapse;">
                        <thead>
                            <tr style = "border: 1px solid black; border-collapse: collapse;">
                                <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                    No.
                                </th>
                                <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                    Product Id
                                </th>
                                <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                    Volume
                                </th>
                                <th style = "border: 1px solid black; border-collapse: collapse; padding:10px">
                                    Price
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${details}
                        </tbody>
                    </table>

                    <p><a href="http://localhost:3000/invoice/${transaction.inv_number}">View Invoice Here</a></p>
                    <a href="http://localhost:5000/${transaction.inv_number}.png">View as Png</a>
                    <p>Contact Us : +62 7777 7777 777</p>
                    <p>WhatsApp : +62 7777 7777 777</p>
                    <p>Instagram : <a href="https://www.instagram.com">Check our instagram page here</a></p>
                </body>
            `
        })
        res.status(200).send("Transaction Rejected")
    }
    catch(error){
        console.log('error : ',error);
        res.status(500).send('Internal service error')
    }
}