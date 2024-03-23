// 밑에 2줄은 express 라이브러리 사용하겠다는 뜻.
const express = require('express')
const app = express()

// mongodb 셋팅
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')
//bcrypt 라이브러리 셋팅
const bcrypt = require('bcrypt')

// socket 라이브러리 셋팅
// const { createServer } = require('http')

const { createServer } = require("node:http")
const { Server } = require('socket.io')
const { join } = require("node:path")
const server = createServer(app)
const io = new Server(server) 


// 환경변수 따로 파일로 만들기.
// npm install dotenv 설치
require('dotenv').config()



// passport 라이브러리 셋팅 시작
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

// connect-mongo 라이브러리 셋팅
const MongoStore = require('connect-mongo') 
const e = require('express')

const sessionMiddleware = session({
    secret: process.env.MIDDLESESSION_PW,
    resave: false,
    saveUninitialized: false,
  });


app.use(sessionMiddleware);

app.use(passport.initialize())
app.use(session({
  secret: process.env.SESSION_PW , // 세션의 document id는 암호화해서 유저에게 보냄
  resave : false, // 유저가 서버로 요청할 때마다 세션 갱신할건지(보통은 false함.)
  saveUninitialized : false, // 로그인 안해도 세션 만들것인지(보통 false)
  cookie : { maxAge : 60 * 60 * 1000 } ,// 세션 document 유효기간 변경 하는 코드(60*1000 -> 60초, 60*60*1000 -> 1시간)
  store : MongoStore.create({
    mongoUrl : process.env.DB_URL,
    dbName : 'forum'
  })
}))

app.use(passport.session()) 
// passport 라이브러리 셋팅 끝.


// multer 기본 라이브러리 셋팅
const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.S3_KEY,
      secretAccessKey : process.env.S3_SECRET,
  }
})

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'paulteacherforum1',
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()) //업로드시 파일명 변경가능
    }
  })
})

app.use(methodOverride('_method'))

// 폴더를 server.js에 등록해두면 폴더안의 파일들 html에서 사용 가능.
app.use(express.static(__dirname +'/public'))
app.use(express.static(__dirname +'/img'))

//ejs 셋팅 하는 코드
app.set('view engine', 'ejs')
// html 파일에 데이터를 넣고 싶으면 .ejs 파일로 만들어야 가능.
// ejs파일은 꼭 views라는 폴더를 만들어서 생성.

// 요청.body 쓰러면 필수적으로 작성해야 됨.
app.use(express.json())
app.use(express.urlencoded({extended:true})) 


// MongoDB 연결하기 위해 하는 셋팅
let connectDB = require('./database.js')

let db;
const url = process.env.DB_URL
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum');
  server.listen(process.env.PORT, () => {
        console.log('http://localhost:8080 에서 실행 중')
    })
}).catch((err)=>{
  console.log(err)
})


app.use('/login', null_check)
app.use('/register', null_check)

function null_check(요청, 응답, next){
    if(!요청.body.usersname ){
        console.log('빈칸으로 제출하지마시오.')

    }
    else if(!요청.body.passward){
        console.log('빈칸으로 제출하지마시오.')

    }
    next()
}


// 서버 띄우는 코드
// app.listen(8080, () => {
//     console.log('http://localhost:8080 에서 실행 중')
// })



// 세션 데이터를 DB에 저장하려면 connect-mongo 라이브러리 설치
// npm install bcrypt -> 해슁을 하기 위해서 사용하는 라이브러리 bcrypt 설치


// 필요한 라이브러리 npm install express-session passport passport-local 
// passport는 회원인증 도와주는 메인라이브러리,
// passport-local은 아이디/비번 방식 회원인증쓸 때 쓰는 라이브러리
// express-session은 세션 만드는거 도와주는 라이브러리입니다.


// passport 라이브러리 사용하면 session 방식 기능 구현할 때 간단함.
// session 방식
// 1. 가입 기능
// 2. 로그인 기능
// 3. 로그인 완료시 세션만들기(어떤 유저가 언제 로그인했고 유효기간은~까지다.)
// passport.serializeUser() 함수 사용하면 세션 만들어줌.
// 4. 로그인 완료시 유저에게 입장권 보내줌.
// 5. 로그인 여부 확인하고 싶으면 입장권 까봄.




// 제출한 아이디 비번이 DB에 있는지 검사하는 로직
// 있으면 세션만들어줌
// 이 밑에 있는 코드를 실행하고 싶으면 passport.authenticate('local')() 쓰면 됨.

passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection('user').findOne({ userid : 입력한아이디})
    if (!result) {
      return cb(null, false, { message: '아이디 DB에 없음' })
    }
    console.log(await bcrypt.compare(입력한비번, result.password))
    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result)
    } else {
      return cb(null, false, { message: '비번불일치' });
    }
  }))

// 밑에 내용은 요청.login() 실행할때마다 같이 실행됨.
// 세션 document에 들어갈 내용들을 보내줌.
passport.serializeUser((user, done) =>{
    process.nextTick(() => { // 내부 코드를 비동기적으로 처리해줌
        done(null, { id : user._id , username: user.username })
    })
})


// 밑에 내용은 마찬가지로 요청.login() 실행할때마다 같이 실행됨.
// 쿠키를 분석해주는 역할(입장권 확인 역할)
// 이 밑 코드가 있으면 아무대서나 요청.user 사용하면 로그인한 사용자의 정보를 보내줌. 
passport.deserializeUser(async (user, done) =>{
    let result = await db.collection('user').findOne({_id: new ObjectId(user.id)})
    delete result.password // 비번은 삭제
    process.nextTick(() => { // 내부 코드를 비동기적으로 처리해줌
        done(null, result) // result에 저장된 값이 요청.user에 들어감.
    })
})



app.get('/', async(요청, 응답)=>{
    let result = await db.collection('post').find().limit(3).toArray()
    if(요청.user == undefined){
        응답.sendFile(__dirname+'/index.html')
    }
    else{
        
        응답.render('index_login.ejs', {result: result})
    }
})



// __dirname -> 현재 프로젝트 절대 경로 의미.(server.js가 담긴 폴더)
app.get('/home', async(요청,응답)=>{
    let result = await db.collection('post').find().limit(3).toArray()
    if(요청.user == undefined || 요청.user.authority == "0"){
        응답.sendFile(__dirname+'/index.html')
    }   
    else{
        응답.render('index_login.ejs', { result : result })
    }
})


app.get('/rank', (요청, 응답) =>{
    if(요청.user == undefined || 요청.user.authority == "normal"){
        응답.render('login.ejs')
    }
    else{
        응답.render('rank.ejs')
    }
})


// await -> 바로 다음줄 실행하지말고 잠깐 기다려주세요
// 자바스크립트는 처리가 오래 걸리는 코드는 처리완료 기다리지 않고 다음줄 실행함. 그래서 await 써줘야됨.
app.post('/like', async(요청, 응답)=> {
    // 만일 post_id = 현재 글 id and user = 현재유저_id
    await db.collection('history').insertOne(
    {
        post_id : new ObjectId(요청.body.id),
        user : 요청.user._id
    })
    응답.redirect('back')
    await db.collection('post').updateOne({ _id : new ObjectId(요청.body.id) }, {$inc : {like : 1}})
})


// DB에 post요청 받았을 때 데이터 넣는 방법.
app.post('/add', upload.single('img1'), async (요청, 응답) => {
    try{
        if(요청.body.title==''){
            응답.send('제목입력안했는데?')
        }else{
            await db.collection('post').insertOne(

                { 
                    title : 요청.body.title, 
                    content : 요청.body.content, 
                    img : 요청.file ? 요청.file.location:'', 
                    // 삼항연산자
                    // ( 조건식 ? 조건식참일때 남길거 : 조건식거짓일때 남길거)
                    user : 요청.user._id,
                    username : 요청.user.username,
                    like : 0
                }
            )
            응답.redirect('/list')
        }
    } catch(e){
        console.log(e)
        응답.status(500).send('서버에러남')
    }
    
})

app.get('/detail/:id', async (요청, 응답) => {
    try{
        if(요청.user == undefined || 요청.user.authority == "normal"){
            응답.render('login.ejs')
        }
        else{
            let comment = await db.collection('comment').find({
                parentId : new ObjectId(요청.params.id)
            }).toArray()
            let result = await db.collection('post').findOne({ 
                _id : new ObjectId(요청.params.id) 
            })
            응답.render('detail.ejs', { result : result , comment : comment})
            if(result == null){
                응답.status(404).send('이상한 url 입력함.') 
            }
        }
        
    } catch(e){
        console.log(e)
        응답.status(404).send('이상한 url 입력함.') 
        // 400 -> 유저 오류 500 -> 서버오류
    }
})


app.get('/edit/:id', async(요청, 응답)=>{
    let result = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id) })  
    응답.render('edit.ejs', { result : result })
})


app.put('/edit', async (요청, 응답) => {
    try{
        let result = await db.collection('post').updateOne({ 
            _id : new ObjectId(요청.body.id),
            user : new ObjectId(요청.user._id) //본인이 쓴글인지 확인
        },
        {$set : { title : 요청.body.title, content : 요청.body.content}
        })
        응답.redirect('/list')
    }catch(e){
        console.log(e)
        응답.status(404).send('이상한 url 입력함.') 
    }
})

    // await db.collection('post').updateOne({ _id : 1 }, {$inc : {like : 2}}) // inc -> 값을 + - 하는 문법
    // 동시에 여러개 document 수정 하는방법.
    // await db.collection('post').updateMany({ _id : 1 }, {$inc : {like : 2}})

    // like 항목이 10 이상인 document 전부 수정 하는 방법
    // await db.collection('post').updateMany({ like : {$gt :10} }, {$inc : {like : 2}}) 
    // $gt : 10 -> like 항목이 10 이상인가 $lt는 이하 $ne는 not 효과


app.delete('/delete', async(요청, 응답)=>{
    if(요청.user.authority == "MANAGER"){
        await db.collection('post').deleteOne({
            _id : new ObjectId(요청.query.docid), // 게시글 아이디 확인
        })
        응답.send('삭제완료')
    }
    else{
        await db.collection('post').deleteOne({
            _id : new ObjectId(요청.query.docid), // 게시글 아이디 확인
            user : new ObjectId(요청.user._id) // 본인이 쓴글인지 확인
            })
        응답.send('삭제완료')
    }
    
    
})

app.delete('/user-delete', async(요청, 응답)=>{
    if(요청.user.authority == "MANAGER"){
        await db.collection('user').deleteOne({
            _id : new ObjectId(요청.query.docid), // 게시글 아이디 확인
        })
        응답.send('삭제완료')
    }
    else{
        await db.collection('user').deleteOne({
            _id : new ObjectId(요청.query.docid), // 게시글 아이디 확인
            user : new ObjectId(요청.user._id) // 본인이 쓴글인지 확인
            })
        응답.send('삭제완료')
    }
    
    
})

app.get('/authority', async(요청,응답)=>{
        let result = await db.collection('user').updateOne({
            _id : new ObjectId(요청.query.docid),
        },
        {$set : { authority : "FC"}
        })
        응답.redirect('back')
})

app.delete('/chat/delete', async(요청, 응답)=>{

    await db.collection('chatroom').deleteOne({
        _id : new ObjectId(요청.query.docid), // 게시글 아이디 확인
        })
    응답.send('삭제완료')
    
})

app.get('/list/:id', async(요청, 응답)=>{
    // 1번 ~ 5번글을 찾아서 result변수에 저장F.
    let userid = 요청.user._id
    let result = await db.collection('post').find().skip((요청.params.id-1)*5).limit(5).toArray()// 컬렉션의 모든 document 출력 하는 법.
    응답.render('list.ejs', { posts : result , userid : userid})
})

app.get('/list/next/:id', async(요청, 응답)=>{
    // 1번 ~ 5번글을 찾아서 result변수에 저장.
    let userid = 요청.user._id
    let result = await db.collection('post').find({_id : {$gt : new ObjectId(요청.params.id)}}).limit(5).toArray()// 컬렉션의 모든 document 출력 하는 법.
    응답.render('list.ejs', { posts : result , userid : userid})
})


app.get('/login', async(요청,응답)=>{

    응답.render('login.ejs')

})

app.post('/login', async(요청,응답, next)=>{
    let result = await db.collection('post').find().limit(3).toArray()
    passport.authenticate('local', (error, user, info)=>{
        
        if(error) return 응답.status(500).json(error) // 에러에 뭐가 들어오면 에러500 보내줌.
        if(!user) return 응답.status(401).json(info.message) // DB에 있는거랑 비교해봤는데 맞지 않는 경우
        
        // 밑에꺼 실행되면 세션만들기가 실행됨.
        // 요청.logIn()이 실행되면 쿠키생성 및 쿠기 확인까지 실행됨.
        
        요청.logIn(user, (err)=>{
            if(err) return next(err)
            응답.render('index_login.ejs', {result:result}) // 로그인 완료시 실행할 코드
        })

    })(요청, 응답, next)

})


app.get('/mypage', async(요청,응답)=>{
    if(요청.user == undefined || 요청.user.authority == "normal"){
        응답.render('login.ejs')
    }
    else{
        let user = await 요청.user
        let result = await db.collection('post').find({
            user : new ObjectId(요청.user._id)
        }).toArray()// 
        응답.render('mypage.ejs', {posts:result, user : user})
    }
    

})


app.get('/register' , (요청, 응답)=>{
    응답.render('register.ejs')
})

app.post('/register' , async(요청, 응답)=>{

    let 해시 = await bcrypt.hash(요청.body.password, 10)
    // 기존의 비밀번호를 해싱을 해서 암호화 하는 작업.
    let result = await db.collection('user').findOne({ userid : 요청.body.userid })  

    if(요청.body.userid == '' || 요청.body.username == '' || 요청.body.nickname == ''){
        console.log("입력되지 않은 칸이 있습니다. 다시 확인해주세요.")
    }
    else if(요청.body.password != 요청.body.password_check){
        console.log('비밀번호가 일치하지 않습니다. 다시 확인해주세요.')
    }
    else if(!result){
        await db.collection('user').insertOne({ 
            
            username : 요청.body.username,
            userid : 요청.body.userid,
            password : 해시, //해싱한 값을 비번에 저장.   
            authority : "normal"
        })
        응답.redirect('/')
    }
    else{
        console.log("이미 존재하는 아이디입니다. 다시 입력해주세요.")
    } 

})


app.get('/list', async(요청, 응답)=>{
    if(요청.user == undefined || 요청.user.authority == "normal"){
        응답.render('login.ejs')
    }
    else{
        let userid = 요청.user._id
        let result = await db.collection('post').find().toArray()// 컬렉션의 모든 document 출력 하는 법.
        if(result == ''){
            응답.render('write.ejs')
        }
        else{
            응답.render('list.ejs', { posts : result , userid : userid })
        }
    }
    
})

app.get('/write', async(요청, 응답)=>{
    if(!요청.user?.username){
        console.log('로그인을 해야 게시글 작성이 가능합니다.')
        응답.render('login.ejs')
    }
    else{
        응답.render('write.ejs')
    }
})

app.use('/shop', require('./routes/shop.js'))

// 기존에 방식으로 DB에서 값을 가져오면 정확히 일치하는 제목만 가져오게됨.
// 그런 경우 정규식 쓰면 해결 ( $regex : -> 이걸로 가져오면 그 키워드가 들어간 모든 값을 다 가져옴.)
// 단점 : 느려터짐.

// search index 만들면 우리가 원하는 검색 기능 가능!
// 단어부분검색 가능, 검색속도 빠름.


app.get('/search', async(요청, 응답)=>{

    let 검색어 = 요청.query.val
    let 검색조건 = [
        {
            $search : {
                index : 'title_index',
                text : { query : 검색어 , path : 'title'}
            }
        }
        // {조건2}
        // {조건3}
        // {$sort : { _id : 1 }} -> id순으로 정렬(-1적으면 역순으로 정렬)
        // {$sort : { 날짜 : 1 }} -> 날짜 순으로 정렬
        // {$limit : 10} -> 검색결과수 제한
        // {$skip:10} -> 10개 건너뛰고 가져오기
        // {$project : {title :1}} -> title 필드 숨기기 (0이면 숨기기, 1이면 보이기)
    ]

    let result = await db.collection('post').aggregate(검색조건).toArray()
    응답.render('search.ejs', {posts : result})
})


app.post('/comment', async (요청, 응답) => {
    await db.collection('comment').insertOne({
        comment : 요청.body.content,
        writerId : new ObjectId(요청.body._id),
        writer : 요청.user.username,
        parentId : new ObjectId(요청.body.parentId)
    })
    응답.redirect('back') // 이전페이지로 이동.
})

app.get('/chat-detail', async(요청, 응답)=>{
    응답.render('chat-detail.ejs')
})

app.get('/manager', async(요청, 응답)=>{
    if(요청.user == undefined || 요청.user.authority == "normal" || 요청.user.authority == "FC" ){
        응답.render('login.ejs')
    }
    else{
        let result = await db.collection('user').find().toArray()
        응답.render('manager.ejs' , {posts : result})
    }
    
})



app.get('/make-chat', async(요청, 응답)=>{
    await db.collection('chatroom').insertOne({
        // member 안에 방문자_id와 작성자의_id 를 각각 저장
        member : [요청.user._id, new ObjectId(요청.query.writerId)],
        date : new Date()
    })
    응답.redirect('/mychat')
})


app.get('/mychat', async(요청, 응답)=>{
    if(요청.user == undefined || 요청.user.authority == "normal"){
        응답.render('login.ejs')
    }
    else{
        let result = await db.collection('chatroom').find({
            member : new ObjectId(요청.user._id)
        }).toArray()
        let opponent_id = []
        for(let i =0;i<result.length;i++){
            if(JSON.stringify(result[i].member[0]) == JSON.stringify(요청.user._id)){
                opponent_id[i] = result[i].member[1]
            }
            else{
                opponent_id[i] =  result[i].member[0]
            }
        }
        let opponent = []
        for(let i =0;i<opponent_id.length;i++){
            opponent[i] =  await db.collection('user').findOne({
                _id : new ObjectId(opponent_id[i])
            })
        }
        응답.render('mychat.ejs', { result : result , opponent: opponent })
    }
    
})


app.get('/mychat/:id', async(요청, 응답)=>{
    if(요청.user == undefined || 요청.user.authority == "normal"){
        응답.render('login.ejs')
    }
    else{
        let result = await db.collection('chatroom').findOne({
            _id : new ObjectId(요청.params.id)
        })
        let user = new ObjectId(요청.user._id)
        let myname_id = ''
        let opponent_id = ''
        let myname = ''
        let opponent = ''
        if(JSON.stringify(요청.user._id) == JSON.stringify(result.member[0])){
            myname_id = result.member[0]
            opponent_id = result.member[1]
            myname = await db.collection('user').findOne({
                _id : myname_id
            })
            opponent = await db.collection('user').findOne({
                _id : opponent_id
            })
            myname = myname.username
            opponent = opponent.username
        }
        else{
            myname_id = result.member[1]
            opponent_id = result.member[0]
            myname = await db.collection('user').findOne({
                _id : myname_id
            })
            opponent = await db.collection('user').findOne({
                _id : opponent_id
            })
            myname = myname.username
            opponent = opponent.username
        }
        try{
            if(JSON.stringify(요청.user._id) == JSON.stringify(result.member[0]) || JSON.stringify(요청.user._id) == JSON.stringify(result.member[1])){
    
                let chatcontent = await db.collection('chatcontent').find({
                    parent_id : new ObjectId(요청.params.id),
                }).toArray()
                응답.render('chat-detail.ejs', { result : result , chatcontent: chatcontent , user : user, myname: myname, opponent:opponent}) 
            }
            else{
                응답.redirect('/login')
            }
        }
        catch(e){
            console.log(e)
            응답.status(404).send('채팅방이 사라졌습니다.')
        }
    }
})
io.engine.use(sessionMiddleware)

// 웹소켓 연결되면 실행되는 코드
io.on('connection', (socket)=>{

    // 보낸 데이터를 받으려면 socket.on() 사용.
    // socket.on('age', (data)=>{
    //     console.log('유저가보낸거', data)
    // })

    // [서버 -> 모든유저] 데이터 전송
    io.emit('name', 'paul') 
    
    // socket.join('1') // 유저를 room으로 보냄.(모든사람에게 데이터를 주는게 아니라, 룸에 있는 사람에게만 데이터를 전송하기 위해서 룸으로 보내면 좋음)

    // 룸 join 요청이 왔을 때 조인시키는 명령어.
    socket.on('ask-join', (data)=>{
        // console.log(socket.request.session) // 현재 로그인된 유저가 뜸.
        socket.join(data)
    })

    // 특정 룸에만 데이터를 전송하는 방법
    socket.on('message', (data)=>{
        
        // DB에 채팅 내용 저장하기(채팅내용, 날짜, 부모_id, 작성자)
        db.collection('chatcontent').insertOne({
            content : data.msg,
            date : new Date(),
            parent_id : new ObjectId(data.room) ,
            writer : new ObjectId(socket.request.session.passport.user.id)
        })

        // 특정 룸에 데이터 뿌리기
        io.to(data.room).emit('broadcast', data.msg)
    })
})

// app.get("/logout", (요청, 응답) => {
//     const sessionId = 요청.user._id
  
//     요청.session.destroy(() => {
//       // disconnect all Socket.IO connections linked to this session ID
//       io.in(sessionId).disconnectSockets();
//       응답.status(204).end();
//       응답.render('login.ejs')
//     });
//   });
