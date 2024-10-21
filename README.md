# frame-work

## author

liuyl

### git代码提交至远程仓库流程：

1. 安装Git并在本地创建一个新的Git仓库。

2. 在该文件夹中，打开终端，并输入以下命令以初始化新的Git仓库
   
   `git init`

3. 关联本地Git仓库到远程Git仓库。

如果您还没有一个远程Git仓库，您需要先创建一个。在某个Git托管服务上（如GitHub、GitLab、Bitbucket等）上创建一个新的远程Git仓库。在该仓库的页面上可以看到仓库的URL地址。以GitHub为例，该地址类似于：

`[https://github.com/](https://github.com/)/.git`

回到您的本地Git仓库中，在终端中输入以下命令以将本地仓库关联到远程仓库：

`git remote add origin [https://github.com/](https://github.com/)/.git`

4. 将本地代码添加到Git仓库，并提交更改。

将您的代码添加到Git仓库可以使用以下命令：

`git add .`

提交更改并添加注释的命令如下：

`git commit -m "Initial commit"`

将更改推送到远程Git仓库：

`git push -u origin master`

这将把您的本地主分支（master）推送到远程Git仓库。

通过以上步骤，在您的远程Git仓库上，您应该能够看到您的本地代码。

如果您需要在其他电脑上下载您的代码并提交分支，请先在该电脑上安装Git，并使用以下命令来克隆您的远程仓库：

`git clone https://github.com/<your-username>/<your-repository>.git`

这将在您的本地计算机上创建一个新的文件夹，并克隆远程Git仓库到该文件夹中。之后，您就可以使用`git checkout -b <new-branch-name>`来创建一个新的分支并进行修改了。修改完成后，可以使用`git push origin <new-branch-name>`将这些更改推送到您的远程Git仓库中的新分支。

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### mongo服务器启动命令汇总

```js
启动mongo服务
mongod --fork --dbpath=/data/mongodb/data --logpath=/data/mongodb/log/mongo.log
（首先使用上面的，下面的没运行成功 上面的是查询出的历史记录）
sudo ./mongod --dbpath=/data/mongodb --logpath=/data/mongodb/log/mongod.log --fork

查看mongo服务
ps -ef|grep mongod
查看端口进程
sudo netstat -tlnp


[root@iZ2zegs8fjen5oykese2vrZ bin]# ./mongod --dbpath /usr/local/mongodb/data/db --bind_ip 0.0.0.0


```

### mongo.conf



```
systemLog:
   destination: file #日志输出方式。file/syslog,如果是file，需指定path，默认是输出到标准输出流中
   path:  /usr/local/mongodb/mongod.log #日志路径
   logAppend: true #启动时，日志追加在已有日志文件内还是备份旧日志后，创建新文件记录日志，默认false
   
net:
  port: 27017 #监听端口，默认27017
  bindIp： 0.0.0.0 #绑定监听的ip，设置为127.0.0.1时，只会监听本机
  maxIncomingConnections: 65536 #最大连接数，可接受的连接数还受限于操作系统配置的最大连接数
  wireObjectCheck: true #检验客户端的请求，防止错误的或无效BSON插入，多层文档嵌套的对象会有轻微性能影响，默认true
  
processManagement:
  fork: true #后台运行
	
security:
  authorization: disabled # enable/disabled # 开启客户端认证

storage:
  dbpath: /usr/local/mongodb/data/db # 数据库地址
  journal:
    enabled: true #启动journal,64位系统默认开启，32位默认关闭
```

启动
`cd /usr/local/mongodb/bin`

./mongo --config ../mongodb.conf



直接启动加后台进程守护
./mongod --dbpath /usr/local/mongodb/data/db --bind_ip 0.0.0.0 --logpath /usr/local/mongodb/mongod.log --fork