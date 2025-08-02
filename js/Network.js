/**
 * 网络通信模块
 * 处理WebSocket连接、房间创建和加入等功能
 */

var Network = function () {
    this.ws = null; // WebSocket连接
    this.isConnected = false; // 是否已连接
    this.roomId = null; // 当前房间ID
    this.playerId = this.generatePlayerId(); // 玩家ID
    this.isRoomOwner = false; // 是否为房主

    // 服务器地址（需要根据实际部署环境修改）
    this.serverUrl = "ws://localhost:8080"; // 本地测试地址
    
    /**
     * 生成玩家ID
     */
    this.generatePlayerId = function() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    };

    /**
     * 连接到WebSocket服务器
     */
    this.connect = function() {
        try {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = function(event) {
                console.log("WebSocket连接已建立");
                this.isConnected = true;
                this.showRoomUI();
            }.bind(this);
            
            this.ws.onmessage = function(event) {
                this.handleMessage(event.data);
            }.bind(this);
            
            this.ws.onclose = function(event) {
                console.log("WebSocket连接已关闭");
                this.isConnected = false;
            }.bind(this);
            
            this.ws.onerror = function(error) {
                console.log("WebSocket错误: " + error);
            };
        } catch (e) {
            console.error("WebSocket连接失败: " + e);
        }
    };

    /**
     * 显示房间界面
     */
    this.showRoomUI = function() {
        // 创建房间界面元素
        var roomUI = document.createElement('div');
        roomUI.id = 'room-ui';
        roomUI.innerHTML = `
            <div class="room-overlay">
                <div class="room-dialog">
                    <h2>房间设置</h2>
                    <div class="room-actions">
                        <button id="create-room-btn">创建房间</button>
                        <button id="join-room-btn">加入房间</button>
                    </div>
                    <div id="create-room-section" class="room-section" style="display:none;">
                        <h3>创建房间</h3>
                        <p>房间码: <span id="room-id-display"></span></p>
                        <p>请将房间码分享给其他玩家</p>
                        <button id="start-game-btn">开始游戏</button>
                    </div>
                    <div id="join-room-section" class="room-section" style="display:none;">
                        <h3>加入房间</h3>
                        <input type="text" id="room-id-input" placeholder="请输入6位房间码" maxlength="6">
                        <button id="join-room-confirm-btn">加入房间</button>
                    </div>
                    <div id="room-info" class="room-section" style="display:none;">
                        <h3>房间信息</h3>
                        <p>房间码: <span id="current-room-id"></span></p>
                        <p>玩家列表:</p>
                        <ul id="player-list"></ul>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(roomUI);
        
        // 绑定事件
        document.getElementById('create-room-btn').addEventListener('click', function() {
            this.createRoom();
        }.bind(this));
        
        document.getElementById('join-room-btn').addEventListener('click', function() {
            this.showJoinRoomSection();
        }.bind(this));
        
        document.getElementById('join-room-confirm-btn').addEventListener('click', function() {
            var roomId = document.getElementById('room-id-input').value;
            if (roomId && roomId.length === 6) {
                this.joinRoom(roomId);
            } else {
                alert('请输入有效的6位房间码');
            }
        }.bind(this));
        
        document.getElementById('start-game-btn').addEventListener('click', function() {
            this.startGame();
        }.bind(this));
    };

    /**
     * 创建房间
     */
    this.createRoom = function() {
        // 生成6位随机房间码
        this.roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        this.isRoomOwner = true;
        
        // 显示房间信息
        document.getElementById('create-room-section').style.display = 'block';
        document.getElementById('room-id-display').textContent = this.roomId;
        document.getElementById('current-room-id').textContent = this.roomId;
        document.getElementById('room-info').style.display = 'block';
        
        // 隐藏其他部分
        document.querySelector('.room-actions').style.display = 'none';
        document.getElementById('join-room-section').style.display = 'none';
        
        // 发送创建房间消息到服务器
        this.sendMessage({
            type: 'create_room',
            roomId: this.roomId,
            playerId: this.playerId
        });
    };

    /**
     * 显示加入房间界面
     */
    this.showJoinRoomSection = function() {
        document.querySelector('.room-actions').style.display = 'none';
        document.getElementById('join-room-section').style.display = 'block';
    };

    /**
     * 加入房间
     */
    this.joinRoom = function(roomId) {
        this.roomId = roomId;
        
        // 发送加入房间消息到服务器
        this.sendMessage({
            type: 'join_room',
            roomId: this.roomId,
            playerId: this.playerId
        });
    };

    /**
     * 开始游戏
     */
    this.startGame = function() {
        if (this.isRoomOwner) {
            this.sendMessage({
                type: 'start_game',
                roomId: this.roomId
            });
        } else {
            alert('只有房主可以开始游戏');
        }
    };

    /**
     * 发送消息到服务器
     */
    this.sendMessage = function(message) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    };

    /**
     * 处理从服务器收到的消息
     */
    this.handleMessage = function(data) {
        try {
            var message = JSON.parse(data);
            switch (message.type) {
                case 'room_created':
                    this.handleRoomCreated(message);
                    break;
                case 'room_joined':
                    this.handleRoomJoined(message);
                    break;
                case 'player_joined':
                    this.handlePlayerJoined(message);
                    break;
                case 'game_started':
                    this.handleGameStarted(message);
                    break;
                default:
                    console.log('未知消息类型: ' + message.type);
            }
        } catch (e) {
            console.error('解析消息失败: ' + e);
        }
    };

    /**
     * 处理房间创建成功的消息
     */
    this.handleRoomCreated = function(message) {
        console.log('房间创建成功: ' + message.roomId);
    };

    /**
     * 处理加入房间成功的消息
     */
    this.handleRoomJoined = function(message) {
        if (message.success) {
            console.log('成功加入房间: ' + message.roomId);
            
            // 更新界面
            document.getElementById('current-room-id').textContent = message.roomId;
            document.getElementById('join-room-section').style.display = 'none';
            document.getElementById('room-info').style.display = 'block';
            
            // 更新玩家列表
            this.updatePlayerList(message.players);
            
            // 设置玩家颜色
            message.players.forEach(function(player) {
                if (player.id === this.playerId) {
                    planeOption.setOnlineMode(player.color);
                }
            }.bind(this));
        } else {
            alert('加入房间失败: ' + message.reason);
        }
    };

    /**
     * 处理有新玩家加入的消息
     */
    this.handlePlayerJoined = function(message) {
        console.log('新玩家加入: ' + message.playerId);
        this.updatePlayerList(message.players);
    };

    /**
     * 处理游戏开始的消息
     */
    this.handleGameStarted = function(message) {
        console.log('游戏开始');
        // 隐藏房间界面，显示游戏界面
        document.getElementById('room-ui').style.display = 'none';
        document.querySelector('.option').style.display = 'block';
    };

    /**
     * 更新玩家列表显示
     */
    this.updatePlayerList = function(players) {
        var playerListElement = document.getElementById('player-list');
        playerListElement.innerHTML = '';
        
        players.forEach(function(player) {
            var li = document.createElement('li');
            li.textContent = player.id + (player.isOwner ? ' (房主)' : '');
            playerListElement.appendChild(li);
        });
    };

    /**
     * 初始化网络模块
     */
    this.init = function() {
        // 添加房间界面的CSS样式
        var style = document.createElement('style');
        style.textContent = `
            #room-ui {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
            }
            
            .room-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .room-dialog {
                background-color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                min-width: 300px;
                text-align: center;
            }
            
            .room-dialog h2, .room-dialog h3 {
                margin-top: 0;
            }
            
            .room-section {
                margin: 15px 0;
            }
            
            .room-actions button, 
            .room-section button {
                margin: 5px;
                padding: 10px 15px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }
            
            .room-actions button:hover, 
            .room-section button:hover {
                background-color: #45a049;
            }
            
            #room-id-input {
                padding: 8px;
                margin: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                width: 150px;
                text-align: center;
                text-transform: uppercase;
            }
            
            #player-list {
                text-align: left;
                max-height: 150px;
                overflow-y: auto;
            }
        `;
        document.head.appendChild(style);
        
        // 连接到服务器
        this.connect();
    };
};

var network = new Network();