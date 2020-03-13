const express = require('express');
const mysql = require('mysql');
const bodyparser = require('body-parser');
const session = require('cookie-session');
const fs = require('fs');
let uTimers = {};
let uUsers = []
let oNucl = [];

//create connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'survey'
});

//connect
db.connect((err) => {
    if (err)
        throw err;
    else
        console.log('Connected to DB');
});

var ses;

const app = express();
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: true}));
app.set('views', __dirname + '/Web');
//app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(session({
    secret: '&*^&#^jdhjshfdu124',
    resave: false,
    saveUninitialized: true
}));
app.get('/', (req, resp) => {
    ses = req.session;
    if (uUsers.indexOf(ses.uID) != -1)
        resp.redirect('/labeling');
    else
        resp.render('login');
});
app.get('/logout', (req, resp) => {
    ses = req.session;
    clearTimeout(uTimers[ses.uID]);
    req.session = null;
    resp.redirect('/');
});
app.post('/', (req, resp) => {
    ses = req.session;
    let sql = `SELECT * FROM users WHERE eMail = '${req.body.username}' AND uPass = '${req.body.pass}'`;
    db.query(sql, (err, results) => {
        if (err)
            throw err;
        else if (results.length != 0) {
            ses.uID = req.body.username;
            uUsers.push(ses.uID);
            ses.stats = 'Initial';
            ses.pCount = 0;
            ses.uname = results[0].uName;
            console.log(ses.uname);
            uTimers[ses.uID] = setTimeout(() => {
                console.log("Logout Timer Reached");
            }, 6000000);
        }
        resp.redirect('/redirects');
    });
});
app.post('/labeling', (req, resp) => {
    ses = req.session;
    if (uUsers.indexOf(ses.uID) == -1) {
        req.session = null;
        resp.end('You were logged out due to inactivity');
    } else {
        var retList = req.body.retObject;
        retList = JSON.parse(retList);
        let sucount = 0;
        for (let i=0; i<retList.entries.length; i++) {
            if (Object.entries(retList.entries[i]).length !== 0) {
                let tmp = retList.entries[i]['source1'];
                if (tmp.length === 0)
                    continue;
                let tmp1 = tmp.split(' ');
                let src1upaz, src2upaz;
                let src1dist, src2dist;
                let src1union, src2union;
                if (tmp1.length === 3) {
                    src1union = tmp1[0];
                    src1upaz = tmp1[1].split(':')[1];
                    src1dist = tmp1[2].split(':')[1].slice(0, -1);
                } else if (tmp1.length === 2) {
                    src1upaz = tmp1[0];
                    src1dist = tmp1[1].split(':')[1].slice(0, -1);
                    src1union = '';
                } else if (tmp1.length === 1) {
                    src1dist = tmp1[0];
                    src1union = '';
                    src1upaz = '';
                }
                if (src1dist.includes('Cox'))
                    src1dist = src1dist.substring(0, 3) + `\\` + src1dist.substring(3);

                tmp = retList.entries[i]['source2'];
                if (tmp.length == 0)
                    continue;
                tmp1 = tmp.split(' ');
                if (tmp1.length === 3) {
                    src2union = tmp1[0];
                    src2upaz = tmp1[1].split(':')[1];
                    src2dist = tmp1[2].split(':')[1].slice(0, -1);
                } else if (tmp1.length === 2) {
                    src2upaz = tmp1[0];
                    src2dist = tmp1[1].split(':')[1].slice(0, -1);
                    src2union = '';
                } else if (tmp1.length === 1) {
                    src2dist = tmp1[0];
                    src2union = '';
                    src2upaz = '';
                }
                if (src2dist.includes('Cox'))
                    src2dist = src2dist.substring(0, 3) + '\\' + src2dist.substring(3);

                let length = retList.entries[i]['leng'];
                let nttn = retList.entries[i]['nttn'];
                let ovun = retList.entries[i]['ovun'];
                let pat = retList.entries[i]['pat'];
                let fat = retList.entries[i]['fat'];
                let fib = retList.entries[i]['fib'];
                let deleted = retList.entries[i]['deleted'];
                console.log(src1dist, src1upaz, src1union, src2dist, src2upaz, src2union, length, nttn, ovun, pat, fat, fib, deleted);

                let sql = `INSERT INTO connections(uID,uName,src1Dist,src1Upaz,src1Union,src2Dist,src2Upaz,src2Union,leng,nttn,overunder,pat,fat,fib,deleted) VALUES('${ses.uID}','${ses.uname}','${src1dist}','${src1upaz}','${src1union}','${src2dist}','${src2upaz}','${src2union}','${length}','${nttn}','${ovun}','${pat}','${fat}','${fib}','${deleted}')`;
                if(i<ses.pCount)
                    sql = `UPDATE connections SET uID = '${ses.uID}',uName = '${ses.uname}',src1Dist = '${src1dist}',src1Upaz = '${src1upaz}',src1Union = '${src1union}',src2Dist = '${src2dist}',src2Upaz = '${src2upaz}',src2Union = '${src2union}',leng = '${length}',nttn = '${nttn}',overunder = '${ovun}',pat = '${pat}',fat = '${fat}',fib = '${fib}',deleted = '${deleted}' WHERE cID = '${retList.entries[i]['cid']}'`;
                db.query(sql, (err, result) => {
                    if (err) {
                        throw err;
                        ses.stats = 'Error';
                        console.log('Error Updating');
                    } else
                        sucount++;
                })
            }
        }
        console.log(`${sucount} entries Inserted/Updated Successfully`);
        ses.stats = 'Success';
        resp.redirect('/labeling');
    }
});
app.get('/redirects', (req, resp) => {
    ses = req.session;
    if (ses.uID)
        resp.redirect('/labeling');
    else
        resp.end('Unsuccessful');
});
app.get('/labeling', (req, resp) => {
    ses = req.session;
    if (uUsers.indexOf(ses.uID) == -1) {
        req.session = null;
        resp.end('You were logged out due to inactivity');
    } else {
        console.log("user is " + ses.uID)
        clearTimeout(uTimers[ses.uID]);
        uTimers[ses.uID] = setTimeout(() => {
            console.log("Logout Timer Reached for " + req.session.uID);
            ses = req.session;
            let ind = uUsers.indexOf(ses.uID);
            uUsers.splice(ind, 1);
        }, 6000000);
        if (ses.uID) {
            let pEntries = []
            let sql1 = `SELECT * FROM connections WHERE uID = '${ses.uID}'`;
            db.query(sql1, (err, results) => {
                if (err)
                    throw err;
                if (results.length !== 0) {
                    ses.pCount = results.length;
                    for (let i = 0; i < results.length; i++) {
                        console.log(results[i])
                        curEntry = {};
                        if (!results[i].src1Union) {
                            if (!results[i].src1Upaz)
                                curEntry['source1'] = results[i].src1Dist.slice();
                            else
                                curEntry['source1'] = results[i].src1Upaz.trimStart() + ' (District:' + results[i].src1Dist.trimStart() + ')';
                        } else
                            curEntry['source1'] = results[i].src1Union.trimStart() + ' (Upazilla:' + results[i].src1Upaz.trimStart() + ' District:' + results[i].src1Dist.trimStart() + ')';
                        if (!results[i].src2Union) {
                            if (!results[i].src2Upaz)
                                curEntry['source2'] = results[i].src2Dist.slice();
                            else
                                curEntry['source2'] = results[i].src2Upaz.trimStart() + ' (District:' + results[i].src2Dist.trimStart() + ')';
                        } else
                            curEntry['source2'] = results[i].src2Union.trimStart() + ' (Upazilla:' + results[i].src2Upaz.trimStart() + ' District:' + results[i].src2Dist.trimStart() + ')';
                        curEntry['leng'] = results[i].leng;
                        curEntry['ovun'] = results[i].overunder.slice();
                        curEntry['nttn'] = results[i].nttn.slice();
                        curEntry['pat'] = results[i].pat.slice();
                        curEntry['fat'] = results[i].fat.slice();
                        curEntry['fib'] = results[i].fib.slice();
                        curEntry['deleted'] = results[i].deleted.slice();
                        curEntry['cid'] = results[i].cID;
                        pEntries.push(curEntry);
                    }
                }
            });
            let sql = `SELECT * FROM locations ORDER BY TRIM(Unions)`;
            db.query(sql, (err, results) => {
                if (err)
                    throw err;
                let unions = {};
                let upaz = new Set();
                let dist = new Set();

                for (let i = 0; i < results.length; i++) {
                    unions[results[i].Unions.trimStart() + ' (Upazilla:' + results[i].Upazilla.trimStart() + ' District:' + results[i].District.trimStart() + ')'] = null;
                    upaz.add(results[i].Upazilla.trimStart() + ' (District:' + results[i].District.trimStart() + ')');
                    dist.add(results[i].District.trimStart());
                }
                let upazillas = Array.from(upaz);
                let districts = Array.from(dist);

                function sortThings(a, b) {
                    a = a.toLowerCase();
                    b = b.toLowerCase();
                    return a > b ? 1 : b > a ? -1 : 0;
                }

                upazs = {};
                dists = {};
                upazillas.sort(sortThings);
                districts.sort(sortThings);
                upazillas.forEach(item => upazs[item] = null);
                districts.forEach(item => dists[item] = null);
                resp.render('labeling', {
                    unions: unions,
                    upazillas: upazs,
                    districts: dists,
                    pEntries: pEntries,
                    uName: ses.uID,
                    stats: ses.stats,
                });
            });
        } else
            resp.send('You have to log in first');
    }
});
app.listen('3000', () => {
    console.log('server started on port 3000')
});
