/**
 * JVCore 签到gimmick
 * 部署位置：public/js/gimmicks/jvcore-checkin.js
 */

(function($) {
    'use strict';

    // 全局变量
    let web3 = null;
    let contract = null;
    let userAddress = null;
    let CONTRACT_ABI = null;
    const CONTRACT_ADDRESS = "0x8d214415b9c5F5E4Cf4CbCfb4a5DEd47fb516392";

    // 定义gimmick
    var jvcoreCheckinGimmick = {
        name: 'jvcore-checkin',
        load: function() {
            // 在页面加载完成后执行
            $.md.stage('bootstrap').subscribe(function(done) {
                initJVcoreCheckin();
                done();
            });
        }
    };

    // 注册gimmick
    $.md.registerGimmick(jvcoreCheckinGimmick);

    // 加载JVCore ABI
    function loadJVcoreABI() {
        return new Promise((resolve, reject) => {
            // 检查是否已经加载
            if (window.jvcore_ABI) {
                CONTRACT_ABI = window.jvcore_ABI;
                resolve();
                return;
            }

            // 检查是否正在加载
            if (window.jvcoreABILoading) {
                const checkInterval = setInterval(() => {
                    if (window.jvcore_ABI) {
                        clearInterval(checkInterval);
                        CONTRACT_ABI = window.jvcore_ABI;
                        resolve();
                    }
                }, 100);
                return;
            }

            // 标记为正在加载
            window.jvcoreABILoading = true;

            // 创建script标签
            const script = document.createElement('script');
            script.src = 'https://jscan.jnsdao.com/scripts/misc/jvcore.nft.js';
            
            script.onload = function() {
                window.jvcoreABILoading = false;
                if (window.jvcore_ABI) {
                    CONTRACT_ABI = window.jvcore_ABI;
                    resolve();
                } else {
                    reject(new Error('JVCore ABI加载失败'));
                }
            };
            
            script.onerror = function() {
                window.jvcoreABILoading = false;
                reject(new Error('无法加载JVCore脚本'));
            };
            
            document.head.appendChild(script);
        });
    }

    // 初始化签到功能
    async function initJVcoreCheckin() {
        try {
            // 等待ABI加载
            await loadJVcoreABI();
            
            // 创建并显示签到组件
            createAndDisplayCheckinComponent();
            
        } catch (error) {
            console.error('JVCore签到初始化失败:', error);
            showError('JVCore签到功能初始化失败: ' + error.message);
        }
    }

    // 创建并显示签到组件
    function createAndDisplayCheckinComponent() {
        // 检查是否已存在签到组件
        if ($('#md-jvcore-checkin').length > 0) {
            return;
        }

        // 创建组件
        const $component = createCheckinComponent();
        
        // 插入到页面中（可以根据需要调整位置）
        // 这里插入到md-body的底部
        $('#md-body').append($component);
        
        // 添加样式
        addCheckinStyles();
        
        // 初始化事件绑定
        initEventBindings();
        
        // 检查现有钱包连接
        checkExistingConnection();
    }

    // 创建签到组件HTML
    function createCheckinComponent() {
        return $(`
            <div id="md-jvcore-checkin" class="md-jvcore-checkin">
                <div class="card border-primary mb-4">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">JVCore 签到系统</h4>
                    </div>
                    <div class="card-body">
                        <!-- 钱包连接部分 -->
                        <div id="jvcore-wallet-section">
                            <p class="card-text">连接钱包以查看和签到您的Core ID</p>
                            <button id="jvcore-connect-btn" class="btn btn-success">
                                <i class="fas fa-wallet"></i> 连接钱包
                            </button>
                            
                            <div id="jvcore-wallet-info" style="display:none; margin-top:20px;">
                                <div class="alert alert-info">
                                    <h6 class="alert-heading">已连接钱包</h6>
                                    <hr>
                                    <p class="mb-2"><code id="jvcore-wallet-address"></code></p>
                                    <button id="jvcore-disconnect-btn" class="btn btn-sm btn-outline-secondary">
                                        断开连接
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Core ID列表部分 -->
                        <div id="jvcore-coreids-section" style="display:none;">
                            <hr>
                            <h5 class="card-title">我的Core ID</h5>
                            <div id="jvcore-coreids-list"></div>
                        </div>
                        
                        <!-- 消息提示 -->
                        <div id="jvcore-message" class="alert" style="display:none; margin-top:15px;"></div>
                    </div>
                </div>
            </div>
        `);
    }

    // 添加样式
    function addCheckinStyles() {
        if ($('#md-jvcore-checkin-styles').length > 0) return;

        const styles = `
            <style id="md-jvcore-checkin-styles">
                /* Core ID卡片样式 */
                .core-id-card {
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 15px;
                    background: #f8f9fa;
                    transition: all 0.3s ease;
                }
                
                .core-id-card:hover {
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    transform: translateY(-2px);
                }
                
                .core-id-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .core-id-title {
                    font-weight: bold;
                    color: #495057;
                    font-size: 1.1rem;
                }
                
                .core-id-status {
                    font-size: 0.85rem;
                    padding: 3px 8px;
                    border-radius: 4px;
                }
                
                .status-active {
                    background-color: #d4edda;
                    color: #155724;
                }
                
                .status-expired {
                    background-color: #f8d7da;
                    color: #721c24;
                }
                
                .checkin-info {
                    margin: 10px 0;
                    padding: 10px;
                    background: white;
                    border-radius: 5px;
                    border-left: 4px solid #007bff;
                }
                
                .last-checkin-time {
                    font-size: 0.9rem;
                    color: #6c757d;
                    margin-bottom: 5px;
                }
                
                .month-status {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    font-weight: bold;
                    margin-top: 5px;
                }
                
                .month-checked {
                    background-color: #d4edda;
                    color: #155724;
                }
                
                .month-not-checked {
                    background-color: #fff3cd;
                    color: #856404;
                }
                
                .checkin-button {
                    margin-top: 10px;
                    min-width: 100px;
                }
                
                .checkin-tip {
                    font-size: 0.8rem;
                    color: #6c757d;
                    margin-top: 5px;
                    font-style: italic;
                }
                
                /* 加载动画 */
                .checkin-loading {
                    text-align: center;
                    padding: 20px;
                }
                
                .checkin-loading .spinner-border {
                    width: 3rem;
                    height: 3rem;
                }
                
                /* 响应式调整 */
                @media (max-width: 768px) {
                    .core-id-card {
                        padding: 12px;
                    }
                    
                    .core-id-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .core-id-status {
                        margin-top: 5px;
                    }
                }
            </style>
        `;

        $('head').append(styles);
    }

    // 初始化事件绑定
    function initEventBindings() {
        $('#jvcore-connect-btn').click(connectWallet);
        $('#jvcore-disconnect-btn').click(disconnectWallet);
    }

    // 检查现有连接
    async function checkExistingConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                web3 = new Web3(window.ethereum);
                
                const accounts = await web3.eth.getAccounts();
                if (accounts.length > 0) {
                    userAddress = accounts[0];
                    handleConnected();
                }
            } catch (error) {
                console.log('检查钱包连接失败:', error);
            }
        }
    }

    // 连接钱包
    async function connectWallet() {
        try {
            const $btn = $('#jvcore-connect-btn');
            $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> 连接中...');
            
            if (typeof window.ethereum === 'undefined') {
                showMessage('请安装MetaMask或其他以太坊钱包', 'danger');
                $btn.prop('disabled', false).html('<i class="fas fa-wallet"></i> 连接钱包');
                return;
            }
            
            // 请求连接钱包
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            web3 = new Web3(window.ethereum);
            const accounts = await web3.eth.getAccounts();
            userAddress = accounts[0];
            
            handleConnected();
            showMessage('钱包连接成功', 'success');
            
        } catch (error) {
            console.error('钱包连接失败:', error);
            let errorMsg = '连接失败';
            if (error.code === 4001) {
                errorMsg = '用户拒绝了连接请求';
            } else if (error.code === -32002) {
                errorMsg = '请检查钱包应用并重试';
            }
            showMessage(errorMsg, 'danger');
            $('#jvcore-connect-btn').prop('disabled', false).html('<i class="fas fa-wallet"></i> 连接钱包');
        }
    }

    // 断开连接
    function disconnectWallet() {
        userAddress = null;
        contract = null;
        
        $('#jvcore-connect-btn').show().prop('disabled', false).html('<i class="fas fa-wallet"></i> 连接钱包');
        $('#jvcore-wallet-info').hide();
        $('#jvcore-coreids-section').hide();
        $('#jvcore-coreids-list').empty();
        
        showMessage('已断开钱包连接', 'success');
    }

    // 处理连接成功
    function handleConnected() {
        // 初始化合约
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        
        // 更新UI
        $('#jvcore-connect-btn').hide();
        $('#jvcore-wallet-info').show();
        $('#jvcore-wallet-address').text(userAddress);
        $('#jvcore-coreids-section').show();
        
        // 加载Core ID列表
        loadCoreIDList();
    }

    // 加载Core ID列表
    async function loadCoreIDList() {
        try {
            $('#jvcore-coreids-list').html(`
                <div class="checkin-loading">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="mt-2">正在加载Core ID...</p>
                </div>
            `);
            
            // 获取Core ID数量
            const balance = await contract.methods.balanceOf(userAddress).call();
            
            if (balance === '0' || parseInt(balance) === 0) {
                $('#jvcore-coreids-list').html(`
                    <div class="alert alert-warning">
                        您还没有Core ID
                    </div>
                `);
                return;
            }
            
            let coreIdsHtml = '';
            const coreIdCount = Math.min(parseInt(balance), 20); // 最多显示20个
            
            for (let i = 0; i < coreIdCount; i++) {
                try {
                    const tokenId = await contract.methods.tokenOfOwnerByIndex(userAddress, i).call();
                    const isLiveness = await contract.methods.isLiveness(tokenId).call();
                    
                    const lastCheckinTime = await getLastCheckinTime(tokenId);
                    const monthStatus = getMonthStatus(lastCheckinTime);
                    
                    coreIdsHtml += createCoreIDCard(tokenId, isLiveness, lastCheckinTime, monthStatus);
                    
                } catch (error) {
                    console.error(`获取Core ID #${i}失败:`, error);
                }
            }
            
            if (coreIdsHtml) {
                $('#jvcore-coreids-list').html(coreIdsHtml);
            } else {
                $('#jvcore-coreids-list').html(`
                    <div class="alert alert-danger">
                        无法加载Core ID信息
                    </div>
                `);
            }
            
        } catch (error) {
            console.error('加载Core ID列表失败:', error);
            $('#jvcore-coreids-list').html(`
                <div class="alert alert-danger">
                    加载失败: ${error.message}
                </div>
            `);
        }
    }

    // 创建Core ID卡片
    function createCoreIDCard(tokenId, isLiveness, lastCheckinTime, monthStatus) {
        const buttonClass = monthStatus.isChecked ? 'btn-secondary' : 'btn-primary';
        const buttonText = monthStatus.isChecked ? '再次签到' : '立即签到';
        const buttonDisabled = monthStatus.isChecked ? 'disabled' : '';
        const buttonOnClick = monthStatus.isChecked ? '' : `onclick="window.jvcoreCheckIn(${tokenId})"`;
        
        return `
            <div class="core-id-card">
                <div class="core-id-header">
                    <div class="core-id-title">Core ID: #${tokenId}</div>
                    <span class="core-id-status ${isLiveness ? 'status-active' : 'status-expired'}">
                        ${isLiveness ? '活跃' : '已过期'}
                    </span>
                </div>
                
                <div class="checkin-info">
                    <div class="last-checkin-time">
                        <strong>最后签到:</strong> ${lastCheckinTime}
                    </div>
                    <div class="month-status ${monthStatus.isChecked ? 'month-checked' : 'month-not-checked'}">
                        ${monthStatus.text}
                    </div>
                </div>
                
                <button ${buttonOnClick} class="btn ${buttonClass} btn-sm checkin-button" ${buttonDisabled}>
                    ${buttonText}
                </button>
                
                <div class="checkin-tip">
                    ${monthStatus.isChecked ? '本月已签到，无需重复操作' : '点击按钮完成本月签到'}
                </div>
            </div>
        `;
    }

    // 获取最后签到时间
    async function getLastCheckinTime(tokenId) {
        try {
            const events = await contract.getPastEvents('CheckIn', {
                filter: { tokenId: tokenId },
                fromBlock: 0,
                toBlock: 'latest'
            });
            
            if (events.length === 0) {
                return '从未签到';
            }
            
            const latestEvent = events[events.length - 1];
            const timestamp = latestEvent.returnValues.timestamp;
            
            const date = new Date(timestamp * 1000);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
        } catch (error) {
            console.error('获取签到时间失败:', error);
            return '未知';
        }
    }

    // 获取月份状态
    function getMonthStatus(lastCheckinTime) {
        if (lastCheckinTime === '从未签到' || lastCheckinTime === '未知') {
            return {
                isChecked: false,
                text: '本月未签到'
            };
        }
        
        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            
            // 解析日期
            const dateStr = lastCheckinTime.split(' ')[0];
            const dateParts = dateStr.split('/');
            
            if (dateParts.length === 3) {
                const checkinYear = parseInt(dateParts[0]);
                const checkinMonth = parseInt(dateParts[1]) - 1; // 月份0-11
                
                const isCurrentMonth = (checkinYear === currentYear && checkinMonth === currentMonth);
                
                return {
                    isChecked: isCurrentMonth,
                    text: isCurrentMonth ? '本月已签到 ✓' : '本月未签到'
                };
            }
            
        } catch (error) {
            console.error('判断月份状态失败:', error);
        }
        
        return {
            isChecked: false,
            text: '本月未签到'
        };
    }

    // 显示消息
    function showMessage(text, type) {
        const $message = $('#jvcore-message');
        $message.removeClass('alert-success alert-danger alert-warning alert-info')
                .addClass(`alert-${type}`)
                .html(text)
                .slideDown();
        
        setTimeout(() => {
            $message.slideUp();
        }, 3000);
    }

    // 显示错误
    function showError(text) {
        showMessage(text, 'danger');
    }

    // 全局签到函数
    window.jvcoreCheckIn = async function(tokenId) {
        try {
            const button = $(`button[onclick="jvcoreCheckIn(${tokenId})"]`);
            const originalText = button.text();
            
            button.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> 处理中...');
            
            // 发送签到交易
            await contract.methods.checkIn(tokenId).send({
                from: userAddress
            });
            
            showMessage('签到成功！', 'success');
            
            // 重新加载列表
            await loadCoreIDList();
            
        } catch (error) {
            console.error('签到失败:', error);
            let errorMsg = '签到失败';
            if (error.message.includes('rejected')) {
                errorMsg = '用户拒绝了交易';
            } else if (error.message.includes('insufficient funds')) {
                errorMsg = 'Gas费用不足';
            }
            showMessage(errorMsg, 'danger');
            
            // 重新加载以恢复按钮状态
            await loadCoreIDList();
        }
    };

}(jQuery));