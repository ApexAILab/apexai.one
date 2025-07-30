/**
 * ApexAI 网站主JavaScript文件
 * 处理页面交互逻辑和通用功能
 */

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('ApexAI 网站已加载');
    
    // 初始化页面功能
    initPage();
});

/**
 * 初始化页面功能
 */
function initPage() {
    // 设置当前页面的导航按钮状态
    setActiveNavigation();
    
    // 添加页面滚动效果
    addScrollEffects();
    
    // 初始化响应式功能
    initResponsiveFeatures();
}

/**
 * 设置当前页面的导航按钮状态
 */
function setActiveNavigation() {
    const currentPage = window.location.pathname;
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        const href = button.getAttribute('href');
        if (href && currentPage.includes(href.replace('pages/', ''))) {
            button.classList.add('active');
        }
    });
}

/**
 * 添加页面滚动效果
 */
function addScrollEffects() {
    const header = document.querySelector('.header');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 添加滚动时的头部样式变化
        if (scrollTop > 50) {
            header.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            header.style.boxShadow = 'none';
        }
        
        lastScrollTop = scrollTop;
    });
}

/**
 * 初始化响应式功能
 */
function initResponsiveFeatures() {
    // 检测设备类型
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
    
    // 根据设备类型调整页面行为
    if (isMobile) {
        console.log('移动设备模式');
        // 移动设备特定功能可以在这里添加
    } else if (isTablet) {
        console.log('平板设备模式');
        // 平板设备特定功能可以在这里添加
    } else {
        console.log('桌面设备模式');
        // 桌面设备特定功能可以在这里添加
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', function() {
        // 重新初始化响应式功能
        initResponsiveFeatures();
    });
}

/**
 * 显示加载状态
 */
function showLoading() {
    // 创建加载指示器
    const loading = document.createElement('div');
    loading.id = 'loading-indicator';
    loading.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        ">
            <div style="
                width: 40px;
                height: 40px;
                border: 3px solid var(--border-color);
                border-top: 3px solid var(--accent-color);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(loading);
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    const loading = document.getElementById('loading-indicator');
    if (loading) {
        loading.remove();
    }
}

/**
 * 显示消息提示
 */
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background-color: ${type === 'success' ? '#34c759' : type === 'error' ? '#ff3b30' : '#007aff'};
        ">
            ${message}
        </div>
        <style>
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        </style>
    `;
    
    document.body.appendChild(messageDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// 导出函数供其他模块使用
window.ApexAI = {
    showLoading,
    hideLoading,
    showMessage
}; 