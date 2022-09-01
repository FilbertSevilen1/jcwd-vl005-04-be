"use strict";
const database = require("../config").promise()
const nodemailer = require("nodemailer");
const appPwd = "tlckpklexhcvikuh";

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const { v4 } = require("uuid");

// async..await is not allowed in global scope, must use a wrapper
async function SendEmail(recipient, htmlStr, subject) {
    if (!recipient) return;
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    //   let testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: "antoniuspetrus.ap@gmail.com", // generated ethereal user
            pass: appPwd, // generated ethereal password
        },
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: '"Antonius Petrus" <antoniuspetrus.ap@gmail.com>', // sender address
        to: recipient, // list of receivers
        subject: subject, // Subject line
        html: htmlStr, // html body
    });

    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
}

module.exports.emailForgotPassword = async function (req, res) {
    if (!req.body.username_or_email) {
        res.status(400).send({
            message: "username or email is required",
            status: "error",
            success: false,
        });
        return;
    }

    let dbRes;
    try {
        [dbRes] = await database.execute(
            `SELECT * FROM users WHERE username = ? OR email = ?`, [req.body.username_or_email, req.body.username_or_email]
        );
    } catch (error) {
        res.status(400).send({
            message: "username or email not valid",
            status: "error",
            success: false,
        });
        return;
    }

    if (dbRes && dbRes.length === 0) {
        res.status(400).send({
            message: "username or email not valid",
            status: "error",
            success: false,
        });
        return;
    }

    const user = dbRes[0];
    const email = user.email;

    const token = v4();
    try {
        await database.execute(
            `UPDATE users SET forgot_password_token = ? WHERE email = ?`, [token, email]
        );
    } catch (error) {
        res.status(500).send({
            message: "email not valid",
            status: "error",
            success: false,
        });
        return;
    }

    const link = `http://localhost:3000/reset-password?token=${token}`;
    const htmlStr = `<html lang="en"><head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Forgot Password social-media-app</title>
  </head>
  
  <body>
      Here is your reset password link, Click here to <a href="${link}"><button>Reset Password</button></a> of your account.<br>
      Click this link if button is not working ${link}
  
  </body></html>`;

    SendEmail(email, htmlStr, "Reset Password for pharmacy-marketplace").catch(
        function (err) {
            console.log(err);
        }
    );

    res.status(200).send({
        message: "success send email",
        status: "ok",
        success: true,
    });
};

module.exports.resetPasswordTokenValidate = async function (req, res) {
    if (!req.body.token) {
        res.status(400).send({
            message: "token is required",
            status: "error",
            success: false,
        });
        return;
    }

    let dbRes;
    try {
        [dbRes] = await database.execute(
            `SELECT * FROM users where forgot_password_token= ?`, [req.body.token]
        );
    } catch (error) {
        res.status(400).send({
            message: "token not valid",
            status: "error",
            success: false,
        });
        return;
    }
    if (dbRes.length === 0) {
        res.status(400).send({
            message: "token not valid",
            status: "error",
            success: false,
        });
        return;
    }

    res.status(200).send({
        message: "success",
        status: "ok",
        success: true,
    });
};

module.exports.resetPassword = async function (req, res) {
    if (!req.body.token) {
        res.status(400).send({
            message: "token is required",
            status: "error",
            success: false,
        });
        return;
    }

    if (!req.body.password) {
        res.status(400).send({
            message: "password is required",
            status: "error",
            success: false,
        });
        return;
    }

    const pwdEnc = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
    try {
        await database.execute(
            `UPDATE users SET password = ? where forgot_password_token= ?`, [pwdEnc, req.body.token]
        );
    } catch (error) {
        res.status(400).send({
            message: error,
            status: "error",
            success: false,
        });
        return;
    }

    res.status(200).send({
        message: "success",
        status: "ok",
        success: true,
    });
};

module.exports.register = async function (req, res) {
    if (req.body.password !== req.body.confirm_password) {
        res.status(400).send({
            message: "password not match",
            status: "error",
            success: false,
        });
        return;
    }

    const verificationToken = v4();
    const pwdEnc = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));

    try {
        await database.execute(
            `INSERT INTO users (username, email, birthday, password, verification_token) VALUES (?, ?, ?, ?, ?);`,
            [req.body.username, req.body.email, req.body.birthday, pwdEnc, verificationToken]
        );
    } catch (error) {
        console.error("Failed insert user", error);
        res.status(500).send({
            message: "username or email already exist",
            status: "error",
            success: false,
        });
        return;
    }

    const link = `http://localhost:3000/verify-email?token=${verificationToken}`;

    const htmlStr = `<html lang="en"><head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Verification social-media-app</title>
  </head>
  
  <body>
      Here is your verification link, Click here to <a href="${link}"><button>Activate</button></a> your account.<br>
      Click this link if button is not working ${link}
  
  </body></html>`;

    SendEmail(
        req.body.email,
        htmlStr,
        "Verification Link for pharmacy-marketplace"
    ).catch(function (err) {
        console.log(err);
    });

    res.status(200).send({
        message: "success",
        status: "ok",
        success: true,
    });
};

module.exports.emailVerifyResend = async function (req, res) {
    let dbRes;
    try {
        [dbRes] = await database.execute(
            `SELECT * FROM users WHERE username = ? OR email = ?`,
            [req.body.username_or_email, req.body.username_or_email]
        );
    } catch (error) {
        res.status(400).send({
            message: "username or email not valid",
            status: "error",
            success: false,
        });
        return;
    }

    if (dbRes && dbRes.length === 0) {
        res.status(400).send({
            message: "username or email not valid",
            status: "error",
            success: false,
        });
        return;
    }

    const user = dbRes[0];
    const email = user.email;
    const password_correct = bcrypt.compareSync(
        req.body.password,
        user.password
    );
    if (password_correct) {
        const verificationToken = v4();
        try {
            await database.execute(
                `UPDATE users set verification_token= ? where email= ? or username= ?`,
                [verificationToken, req.body.username_or_email, req.body.username_or_email]
            );
        } catch (error) {
            console.error("Failed update verification token");
            res.status(500).send({
                message: "Failed update verification token",
                status: "error",
                success: false,
            });
            return;
        }

        const link = `http://localhost:3000/verify-email?token=${verificationToken}`;

        const htmlStr = `<html lang="en"><head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Verification social-media-app</title>
  </head>
  
  <body>
      Here is your verification link, Click here to <a href="${link}"><button>Activate</button></a> your account.<br>
      Click this link if button is not working ${link}
  
  </body></html>`;

        SendEmail(
            email,
            htmlStr,
            "Verification Link for pharmacy-marketplace"
        ).catch(function (err) {
            console.log(err);
        });

        res.status(200).send({
            message: "Success",
            status: "success",
            success: true,
        });
        return;
    } else {
        res.status(400).send({
            message: "password not valid",
            status: "error",
            success: false,
        });
        return;
    }
};

module.exports.emailVerify = async function (req, res) {
    let dbRes;
    try {
        [dbRes] = await database.execute(
            `SELECT * FROM users WHERE verification_token = ?`, [req.body.token]
        );
    } catch (error) {
        res.status(400).send({
            message: "Verification token invalid!",
            status: "error",
            success: false,
        });
        return;
    }

    if (dbRes && dbRes.length === 0) {
        res.status(400).send({
            message: "Verification token invalid!",
            status: "error",
            success: false,
        });
        return;
    }

    const user = dbRes[0];
    if (user.verification === 1) {
        res.status(400).send({
            message: "Your account already verified!",
            status: "error",
            success: false,
        });
        return;
    }
    try {
        await database.execute(
            `UPDATE users SET verification = TRUE where verification_token= ?`, [req.body.token]
        );
    } catch (error) {
        res.status(400).send({
            message: error,
            status: "error",
            success: false,
        });
        return;
    }
    res.status(200).send({
        message: "Verification success",
        status: "ok",
        success: true,
    });
};

module.exports.login = async function (req, res) {
    let dbRes;
    try {
        [dbRes] = await database.execute(
            `SELECT * FROM users WHERE username = ? OR email = ?`,
            [req.body.username_or_email, req.body.username_or_email]
        );
    } catch (error) {
        res.status(400).send({
            message: "username or email not valid",
            status: "error",
            success: false,
        });
        return;
    }


    if (dbRes && dbRes.length === 0) {
        res.status(400).send({
            message: "username or email not valid",
            status: "error",
            success: false,
        });
        return;
    }

    if(dbRes[0].is_active==0){
        return res.status(400).send({
            message: "user has been blocked!",
            status: "error",
            success: false
        })
    }

    let token = "";

    const user = dbRes[0];
    const password_correct = bcrypt.compareSync(
        req.body.password,
        user.password
    );
    if (password_correct) {
        if (user.verification === 0) {
            res.status(400).send({
                message: `Your account not yet verified !`,
                code: 101, //for frontend to know when to show resend verification button
                status: "error",
                success: false,
            });
            return;
        }
        delete user.password;
        const now = moment();

        const payload = {
            iat: now.unix(),
            // exp: now.add(1, "days").unix(),
            exp: now.add(1, "day").unix(),
            user: user,
        };
        if (req.body.keep_login === true) {
            payload.keep_login = true;
        }

        token = jwt.sign(payload, "asd123");
    } else {
        res.status(400).send({
            message: "password not valid",
            status: "error",
            success: false,
        });
        return;
    }

    res.status(200).send({
        message: "success",
        status: "ok",
        success: true,
        data: {
            access_token: token,
        },
    });
};
