/*
const express = require('express');
const cors = require('cors');
const connection  = require('./connection');
const app = express();

const userRoute = require('./routes/user');

app.use(cors());
app.use(express.urlencoded({extended: true}));
app.use(express.json);
app.use('/user', userRoute);


module.exports = app;

*/

const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const cors = require('cors');
app.use(cors());

const jwt = require('jsonwebtoken');
// Code for forget password
const nodemailer = require('nodemailer');
const myEmail = 'anagha.ambekar03@gmail.com';
const email_password = 'jwmdlszjajlyuhzu';

require ('dotenv').config();
const Access_Token = '0e87cec3494db50ffc6660c65c09f6a167c376d1d502a7f4ef13a8a19e996124c7c21b46ac63a20a315c129cce9bbd2c18bb5ca29ca0f095699628f075078d3a';

let auth = require('./services/authentication');
let checkRole = require('./services/checkRole');

// Variables define to generate pdf bill
let ejs = require('ejs');
let pdf = require('html-pdf');
let path = require('path');
let fs = require('fs');
let uuid = require('uuid');


const mysql = require('mysql');
const { query } = require('express');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'cafenodejs'
})

connection.connect(err => {
    if(err) {
        console.log(err);
    } else {
        console.log("Database Cafe Connected...")
    }
})

app.get('/', (req, res) => {
    res.send('Hello World  cafe Testing');
});

app.post('/user/signup',(req,res) => {
    let user = req.body;
    const query = "SELECT email,password,role,status FROM user WHERE email=?";
    connection.query(query,[user.email], (err,results) => {
        // If error doesnt occur
        if(!err) {
            // rechecking the email again. No record is found in db insert data
            if(results.length <= 0) {
                // insert first 4...status initially will b false
                const query = "INSERT INTO user (name,contactNumber,email,password,status,role) VALUES (?,?,?,?,'false','user')";
                connection.query(query, [user.name, user.contactNumber, user.email, user.password],(err, results) =>{
                    if(!err) {
                        return res.status(200).json({message: "Successfully Registered"});

                    } else {
                        return res.status(500).json(err);
                    }
                })
                
            }else {
                return res.status(400).json({message: 'Email Already Exists'});
            }

        }else {
            return  res.status(500).json(err);
        }
    })

});

app.post('/user/login', (req,res) => {
    const user = req.body;
    const query = "SELECT email,password,role,status FROM user WHERE email=?";
    connection.query(query,[user.email],(err,results) => {
        if(!err) {
            if(results.length <=0 || results[0].password != user.password) {
                return res.status(401).json({message: "Incorrect Username or Password"});
            } else if(results[0].status === 'false') {
                return res.status(401).json({message : "Wait for Admin Approval"});
            } else if(results[0].password == user.password) {
                //Generate token
                const response = {email: results[0].email, role: results[0].role}
                const token = jwt.sign(response,Access_Token, {expiresIn:'8h'})
                res.status(200).json({token: token});
            } else {
                return res.status(400).json({message:"Something went wrong.Please try again later"})
            }
        } else {
            return res.status(500).json(err);
        }
    })
});

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: myEmail,
        pass: email_password
    }
});

app.post('/user/forgetPassword',(req,res) => {
    const user = req.body;
    const query = 'SELECT email,password FROM user WHERE email=?';
    connection.query(query,[user.email],(err,results) => {
        if(!err) {
            if(results.length <=0) {
                return res.status(200).json({message: "Password sent successfully to your email."});
            }
            else {
                let mailOptions = {
                    from: myEmail,
                    to: results[0].email,
                    subject: 'Password by Cafe Management System',
                    html: '<p><b>Your Login details  for Cafe Management System</b><br><b>Email: </b>'+results[0].email+' <br> <b>Password: </b>'+results[0].password+' <br> <a href="http://localhost:4200/">Click here to login</a></p>'
                };
                transporter.sendMail(mailOptions,function(error,info){
                    if(error) {
                        console.log(error);
                    } else {
                        console.log('Email Send: '+ info.response);
                    }
                });
                return res.status(200).json({message: "Password sent successfully to your email."});
            }
        } else {
            return res.status(500).json(err);
        }
    });
});

// Api to get all the user
app.get('/user/get',(req,res) => {
    const query = "SELECT id, name, email, contactNumber, status FROM user WHERE role='user'";
    connection.query(query,(err,results) => {
        if(!err) {
            return res.status(200).json(results);
        }else {
            return res.status(500).json(err);
        }
    });
});

// Api to update the status of the user
app.patch('/user/update',(req,res) => {
    let user = req.body;
    const query = "UPDATE user SET status=? WHERE id=?";
    connection.query(query,[user.status,user.id],(err,results) => {
        if(!err) {
            if(results.affectedRows == 0) {
                return res.status(404).json({message: "User id does not exisits"});
            } else {
                return res.status(200).json({message: "User updated Successfully"});
            }
        } else {
            return res.status(500).json(err);
        }
    });
});

app.get('/user/checkToken',(req,res) => {
    return res.status(200).json({message: "true"});
});

// 
app.post('/user/changePassword',(req,res) => {
    const user = req.body;
    //const email = res.locals.email;
    //console.log(email);
    let query = 'SELECT * FROM user WHERE email=? AND password=?';
    connection.query(query,[user.email,user.oldPassword],(err,results) => {
        if(!err) {
            if(results.length <= 0) {
                return res.status(400).json({message: "Incorrect old Password."});
            } else if(results[0].password == user.oldPassword){
                query = "UPDATE user SET password=? WHERE email=?";
                connection.query(query,[user.newPassword,user.email],(err,results) => {
                    if(!err) {
                        return res.status(200).json({message: "Password updated successfully."});
                    }else {
                        return res.status(500).json(err);
                    }
                });
            }else {
                return res.status(400).json({message: "Something went wrong.Please try again later."});
            }
        } else {
            return res.status(500).json(err);

        }
    });

});


app.post('/category/add',(req,res) => {
    let category = req.body;
    const query = "INSERT INTO category (name) VALUES(?)";
    connection.query(query,[category.name], (err,results) => {
        if(!err) {
            return res.status(200).json({message: "Category successfully Added."});
        } else {
            return res.status(500).json(err);
        }
    });
});

app.get('/category/get',(req,res) => {
    const query = "SELECT * FROM category ORDER BY name";
    connection.query(query,(err,results) => {
        if(!err) {
            return res.status(200).json(results);
        }else {
            return res.status(500).json(err);
        }
    });
});

app.patch('/category/update',(req,res) => {
    let product = req.body;
    const query = "UPDATE category SET name=? WHERE id=?";
    connection.query(query,[product.name,product.id],(err,results) => {
        if(!err) {
            if(results.affectedRows == 0) {
                return res.status(404).json({message: "Category Id does not found."});
            } 
            return res.status(200).json({message: "Category Updated successfully."});
        } else {
            return res.status(500).json(err);
        }
    });
});

// API for product 
app.post('/product/add',(req,res) => {
    let product = req.body;
    const query = "INSERT INTO product (name,categoryId,description,price,status) VALUES (?,?,?,?,'true')";
    connection.query(query,[product.name,product.categoryId,product.description,product.price],(err,results) => {
        if(!err){
            return res.status(200).json({message: "Product added successfully"});
        } else {
            return res.status(500).json(err);
        }
    })
});

app.get('/product/get',(req,res) => {
    const query = "SELECT p.id,p.name,p.description,p.price,p.status,c.id as categoryId,c.name as categoryName FROM product as p INNER JOIN category as c WHERE p.categoryId = c.id";
    connection.query(query,(err,results) => {
        if(!err) {
            return res.status(200).json(results);
        } else {
            return res.status(500).json(err);
        }
    });
});

app.get('/product/getByCategory/:id',(req,res,next) => {
    const id = req.params.id;
    const query = "SELECT id,name FROM product WHERE categoryId=? AND status='true'";
    connection.query(query,[id],(err,results) => {
        if(!err) {
            return res.status(200).json(results);
        } else {
            return res.status(500).json(err);
        }
    });
});

app.get('/product/getById/:id',(req,res,next) => {
    const id = req.params.id;
    const query = "SELECT id,name,description,price FROM product WHERE id=?";
    connection.query(query,[id],(err,results) => {
        if(!err) {
            return res.status(200).json(results);
        } else {
            return res.status(500).json(err);
        }
    });
});

app.patch('/product/update',(req,res,next) => {
    let product = req.body;
    const query ="UPDATE product SET name=?,categoryId=?,description=?,price=? WHERE id=?";
    connection.query(query,[product.name,product.categoryId,product.description,product.price,product.id],(err, results) => {
        if(!err) {
            if(results.affectedRows == 0) {
                return res.status(404).json({message: "Product Id does not found."});
            } 
            return res.status(200).json({message: "Product Updated successfully."});
        } else {
            return res.status(500).json(err);
        }
    });

    });

app.delete('/product/delete/:id',(req,res,next) => {
    const id = req.params.id;
    const query = "DELETE FROM product WHERE id=?";
    connection.query(query,[id],(err, results) => {
        if(!err) {
            if(results.affectedRows == 0) {
                return res.status(404).json({message: "Product Id does not found."});
            } 
            return res.status(200).json({message: "Product Deleted successfully."});
        } else {
            return res.status(500).json(err);
        }
    });
});

app.patch('/product/updateStatus',(req,res) => {
    let user = req.body;
    const query ="UPDATE product SET status=? WHERE id=?";
    connection.query(query,[user.status,user.id],(err, results) => {
        if(!err) {
            if(results.affectedRows == 0) {
                return res.status(404).json({message: "Product Id does not found."});
            } 
            return res.status(200).json({message: "Product status updated successfully."});
        } else {
            return res.status(500).json(err);
        }
    });

})

////////////////////////////////////////**************//////////////////////////////////////////////
// Api to generate bills
app.post('/bill/generateReport', (req,res) => {
    const generatedUuid = uuid.v1();
    const orderDetails = req.body;
    let productDetailsReport = JSON.parse(orderDetails.productDetails);

    const query = "INSERT INTO bill (name,uuid,email,contactNumber,paymentMethod,total,productDetails,createdBy) VALUES (?,?,?,?,?,?,?,?)";
    connection.query(query,[orderDetails.name,generatedUuid,orderDetails.email,orderDetails.contactNumber,orderDetails.paymentMethod,orderDetails.totalAmount,orderDetails.productDetails,'true'],(err,results) => {
        if(!err) {
            // Pass all details we require in pdf
            ejs.renderFile(path.join(__dirname,'',"routes/report.ejs"),{productDetails:productDetailsReport,name:orderDetails.name,email:orderDetails.email,contactNumber:orderDetails.contactNumber,paymentMethod:orderDetails.paymentMethod,totalAmount:orderDetails.totalAmount},(err,results) => {
                if(err) {
                    return res.status(500).json(err);
                }
                else {
                    pdf.create(results).toFile('./generated_pdf/'+generatedUuid+".pdf",function(err,results) {
                        if(err){
                            console.log(err);
                            return res.status(500).json(err);
                        } else {
                            return res.status(200).json({uuid: generatedUuid});
                        }
                    })
                }
            })
        } else {
            return res.status(500).json(err);
        }
    })
})

app.post('/bill/getPdf',function(req,res) {
    const orderDetails = req.body;
    const pdfPath = './generated_pdf/'+ orderDetails.uuid+'.pdf';
    if(fs.existsSync(pdfPath)){
        res.contentType("application/pdf");
        fs.createReadStream(pdfPath).pipe(res);
    }
    else {
        let productDetailsReport = JSON.parse(orderDetails.productDetails);
        ejs.renderFile(path.join(__dirname,'',"routes/report.ejs"),{productDetails:productDetailsReport,name: orderDetails.name,email:orderDetails.email,contactNumber:orderDetails.contactNumber,paymentMethod:orderDetails.paymentMethod,totalAmount:orderDetails.totalAmount},(err,results) => {
            if(err) {
                return res.status(500).json(err);
            }
            else {
                pdf.create(results).toFile('./generated_pdf/'+ orderDetails.uuid +".pdf",function(err,results) {
                    if(err){
                        console.log(err);
                        return res.status(500).json(err);
                    } else {
                        res.contentType("application/pdf");
                        fs.createReadStream(pdfPath).pipe(res);
                    }
                })
            }
        })

    }
});

app.get('/bill/getBill', (req,res,next) => {
    const query = "SELECT * FROM bill ORDER BY id DESC";
    connection.query(query,(err,results) => {
        if(!err) {
            return res.status(200).json(results);
        } else {
            return req.status(500).json(err);
        }
    })
});

app.delete('/bill/delete/:id',(req,res,next) => {
    const id = req.params.id;
    const query = "DELETE FROM bill WHERE id=?";
    connection.query(query,[id],(err,results) => {
        if(!err){
            if(results.affectedRows == 0){
                return res.status(404).json({message:"Bill id not found"});
            }
            return res.status(200).json({message:"Bill Deleted successfully"});

        }else {
            return res.status(500).json(err);
        }
    });
});

/////////////////////////////////////////***************//////////////
//Api for Dashboard
app.get('/dashboard/details',(req,res,next) => {
    let categoryCount;
    let productCount;
    let billCount;
    const query = "SELECT count(id) as categoryCount FROM category";
    connection.query(query,(err,results) => {
        if(!err) {
            categoryCount = results[0].categoryCount;
        } else {
            return res.status(500).json(err);
        }
    });

    const query1 = "SELECT count(id) as productCount FROM product";
    connection.query(query1,(err,results) => {
        if(!err) {
            productCount = results[0].productCount;
        } else {
            return res.status(500).json(err);
        }
    });

    const query2 = "SELECT count(id) as billCount FROM bill";
    connection.query(query2,(err,results) => {
        if(!err) {
            billCount = results[0].billCount;
            let data = {
                category:categoryCount,
                product:productCount,
                bill:billCount
            };
            return res.status(200).json(data);
        } else {
            return res.status(500).json(err);
        }
    });
});



const port = 4050;
app.listen(port); 
