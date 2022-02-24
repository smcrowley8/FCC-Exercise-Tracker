const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let mongoose;
try {
  mongoose = require("mongoose");
} catch (e) {
  console.log(e);
}
let myURI = process.env['MONGO_URI'];

mongoose.connect(myURI, 
  { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  }
);

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({
  extended: false//true
})); 
app.use( bodyParser.json() );

//const Person = require("./person.js").PersonModel;

app.use(cors())
app.use(express.static('public'))
app.get('/', async (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
const exerciseSchema = mongoose.Schema({
  //uid: {type: String},
  description: {type: String},
  duration: {type: Number},
  date: {type: String},
  username: {type: String}
})
const userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: false },
  exercises: {type: [exerciseSchema], required: false}
});
const User = mongoose.model('Users', userSchema);

const defaultDate = () => new Date().toDateString();//toISOString().slice(0, 10);

function addExercise(req, res, next){
  const userId = req.params._id || req.body._id;
  let exObj = { 
    description: req.body.description,
    duration: +req.body.duration,
    date: req.body.date || defaultDate()
  }; 
  User.findById(userId, (err, usr)=>{
    if(err) return next(err);
    
    exObj.username = usr.username;
    //above used to not be
    User.findByIdAndUpdate(
      userId,
      {$push: { exercises: exObj } }, 
      {new: true},
      (err, updatedUser)=>{
        if(err) return next(err);
        
        let returnObj = {
          username: updatedUser.username,
          description: exObj.description,
          duration: exObj.duration,
          date: exObj.date,
          _id: updatedUser._id
        };
        res.json(returnObj);//updatedUser);
      }
    );
  });
}

app.post('/api/users', (req, res, next)=>{
  const uname = req.body.username;
  let usr = new User({username: uname});
  usr.save((err, data)=>{
    if (err) return next(err);
    //verify person exists
    User.findById(data._id, (err, usr)=>{
      if (err) return next(err);
      //if person exists, send json
      
      res.json(usr);
    });
  });
});

app.get('/api/users', (req, res, next)=>{
  User.find({}, (err, usrs)=>{
    if(err) return next(err);
    res.json(usrs);
  })
})

app.post('/api/users/:_id/exercises', addExercise);

app.get('/api/users/:_id/logs', (req, res, next)=>{
  let userId = req.params._id || req.body._id;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  
  User.findById(userId, (err, usrs)=>{
    if (err)return next(err);

    let logs = usrs.exercises || [];
    if(from!=null){
      fromDate = new Date(from);
      logs.filter((ele)=>{
        return (new Date(ele.date) - fromDate)>0
      });
    }
    if(to!=null){   
      toDate = new Date(to);
      logs = logs.filter((ele)=>{
        return (new Date(ele.date) - toDate) < 0
      });
    }
    if(limit!=null){
      if(logs.length > limit){
        logs = logs.slice(0, limit);
      }
    }
    let returnObj = {
      username: usrs.username,
      count: logs.length,
      _id: usrs._id,
      log: logs
    };

    res.json(returnObj);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
