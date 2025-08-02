/**
 * Created by Andrew on 2015/5/14.
 */
/**
 * 设置
 * @constructor
 */
var PlaneOption = function () {
    /**
     *
     * @param color /red/blue/yellow/green
     * @param state /normal/close/win/computer
     * @constructor
     */
    var PLANEUSER = function (color, state) {
        this.color = color;
        this.state = state;
    };
    this.userList = [new PLANEUSER('red', 'normal'), new PLANEUSER('blue', 'computer'), new PLANEUSER('yellow', 'computer'), new PLANEUSER('green', 'computer')];
    this.difficulty = 'normal';  //难度
    this.currentUser = 'red';  //当前用户
    this.backgroundMusic = true;    //背景音乐开关
    this.gameMusic = true;  //游戏音效开关
    this.isOnlineMode = false; // 是否为在线模式
    this.playerColor = 'red'; // 在线模式下的玩家颜色
    
    /**
     * 设置难度
     */
    this.setDifficulty = function () {
        $j('#nandu li').each(function () {
            if ($j(this).hasClass('bth')) {
                switch ($j(this).text()) {
                    case '简单':
                        this.difficulty = 'easy';
                        break;
                    case '普通':
                        this.difficulty = 'normal';
                        break;
                    case '难':
                        this.difficulty = 'hard';
                        break;
                }
            }
        });
    };

    /**
     * 设置默认首个启动用户
     */
    function setFirstUser() {
        for (var i = 0; i < this.userList.length; i++) {
            if (this.userList.state == 'normal') {
                this.currentUser = this.userList.color;
                return;
            }
        }
    }

    function setUser(obj, user) {
        $j(obj).each(function () {
            if ($j(this).hasClass('bth')) {
                switch ($j(this).text()) {
                    case '玩家':
                        user.state = 'normal';
                        break;
                    case '电脑':
                        user.state = 'computer';
                        break;
                    case '无':
                        user.state = 'close';
                        break;
                }
            }
        });
    }

    this.setUserList = function () {
        // 在在线模式下，根据服务器分配的颜色设置玩家
        if (this.isOnlineMode) {
            // 重置所有用户为电脑或关闭状态
            for (var i = 0; i < this.userList.length; i++) {
                if (this.userList[i].color !== this.playerColor) {
                    // 保留两个电脑玩家，将其他设置为关闭
                    if (this.userList[i].color === 'blue' || this.userList[i].color === 'yellow') {
                        this.userList[i].state = 'computer';
                    } else {
                        this.userList[i].state = 'close';
                    }
                } else {
                    this.userList[i].state = 'normal';
                }
            }
        } else {
            // 本地模式保持原有逻辑
            setUser('#redUser li', this.userList[0]);
            setUser('#blueUser li', this.userList[1]);
            setUser('#yellowUser li', this.userList[2]);
            setUser('#greenUser li', this.userList[3]);
        }
    };

    /**
     * 开始
     */
    this.begin = function () {
        this.setUserList();
        this.setDifficulty();
        createPlane(planeOption.userList);
        $j("#sdn" + planeOption.currentUser).text('请投骰');
        $j('.option').hide();
        
        // 初始化网络模块
        if (!network.isConnected) {
            network.init();
        }
    };

    this.tabStyle = function (obj) {
        $j(obj).each(function () {
            $j(this).click(function () {
                $j(this).addClass('bth');
                $j(this).siblings().removeClass('bth');
            });
        });
    };
    
    /**
     * 设置在线模式
     */
    this.setOnlineMode = function(playerColor) {
        this.isOnlineMode = true;
        this.playerColor = playerColor;
    };
};
var planeOption = new PlaneOption();