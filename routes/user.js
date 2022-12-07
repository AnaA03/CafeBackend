
const { query } = require('express');
const express = require('express');
const connection = require('./connection');
const router = express.Router();

router.get('/user/',(req,res) => {
    res.send('Hello World Cafe.. Testing');
})

router.post('/signup',(req,res) => {
    let user = req.body;
    query = "SELECT email,password,role,status FROM user WHERE email=?";
    connection.query(query,[user.email], (err,results) => {
        // If error doesnt occur
        if(!err) {
            // rechecking the email again. No record is found in db insert data
            if(results.length <= 0) {
                // inert first 4...status initially will b false
                query = "INSERT INTO user (name,contactNumber,email,password,status,role) VALUES (?,?,?,?,'false','user')";
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


module.exports = router;
