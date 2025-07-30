/**
 * ApexAI 图像处理功能模块
 * 处理图像处理相关的交互逻辑
 */

// 全局变量
let selectedFile = null;
let selectedProcessingOption = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('图像处理模块已加载');
    initImageProcessing();
});

/**
 * 初始化图像处理功能
 */
function initImageProcessing() {
    // 获取页面元素
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const processBtn = document.getElementById('processBtn');
    const downloadProcessedBtn = document.getElementById('downloadProcessedBtn');
    const resetBtn = document.getElementById('resetBtn');

    // 绑定事件监听器
    if (uploadArea) {
        uploadArea.addEventListener('click', () => imageInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
    }

    if (imageInput) {
        imageInput.addEventListener('change', handleFileSelect);
    }

    if (processBtn) {
        processBtn.addEventListener('click', handleProcessImage);
    }

    if (downloadProcessedBtn) {
        downloadProcessedBtn.addEventListener('click', handleDownloadProcessed);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
    }
}

/**
 * 处理拖拽悬停
 */
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.style.borderColor = 'var(--accent-color)';
        uploadArea.style.backgroundColor = 'var(--background-secondary)';
    }
}

/**
 * 处理文件拖拽
 */
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.style.borderColor = 'var(--border-color)';
        uploadArea.style.backgroundColor = 'white';
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

/**
 * 处理文件选择
 */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

/**
 * 处理文件
 */
function handleFile(file) {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        if (window.ApexAI) {
            window.ApexAI.showMessage('请选择图像文件', 'error');
        } else {
            alert('请选择图像文件');
        }
        return;
    }

    // 验证文件大小（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        if (window.ApexAI) {
            window.ApexAI.showMessage('文件大小不能超过10MB', 'error');
        } else {
            alert('文件大小不能超过10MB');
        }
        return;
    }

    selectedFile = file;
    
    // 显示原图预览
    displayOriginalImage(file);
    
    // 显示处理选项
    showProcessingOptions();
    
    if (window.ApexAI) {
        window.ApexAI.showMessage('图像上传成功', 'success');
    }
}

/**
 * 显示原图预览
 */
function displayOriginalImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const originalImage = document.getElementById('originalImage');
        if (originalImage) {
            originalImage.innerHTML = `
                <img src="${e.target.result}" alt="原图" style="
                    max-width: 100%;
                    max-height: 300px;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                ">
            `;
        }
    };
    reader.readAsDataURL(file);
}

/**
 * 显示处理选项
 */
function showProcessingOptions() {
    const processingOptions = document.getElementById('processingOptions');
    if (processingOptions) {
        processingOptions.style.display = 'block';
        processingOptions.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * 选择处理选项
 */
function selectProcessingOption(option) {
    selectedProcessingOption = option;
    
    // 重置所有选项的样式
    const options = ['enhanceOption', 'removeBgOption', 'styleOption', 'resizeOption'];
    options.forEach(optionId => {
        const element = document.getElementById(optionId);
        if (element) {
            element.style.border = '1px solid var(--border-color)';
            element.style.backgroundColor = 'white';
        }
    });
    
    // 设置选中选项的样式
    const selectedElement = document.getElementById(option + 'Option');
    if (selectedElement) {
        selectedElement.style.border = '2px solid var(--accent-color)';
        selectedElement.style.backgroundColor = 'var(--background-secondary)';
    }
    
    // 启用处理按钮
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.disabled = false;
        processBtn.style.opacity = '1';
    }
}

/**
 * 处理图像
 */
function handleProcessImage() {
    if (!selectedFile) {
        if (window.ApexAI) {
            window.ApexAI.showMessage('请先上传图像', 'error');
        } else {
            alert('请先上传图像');
        }
        return;
    }

    if (!selectedProcessingOption) {
        if (window.ApexAI) {
            window.ApexAI.showMessage('请选择处理选项', 'error');
        } else {
            alert('请选择处理选项');
        }
        return;
    }

    // 显示加载状态
    if (window.ApexAI) {
        window.ApexAI.showLoading();
    }

    // 模拟图像处理过程
    simulateImageProcessing();
}

/**
 * 模拟图像处理过程
 */
function simulateImageProcessing() {
    console.log('开始处理图像，选项：', selectedProcessingOption);

    // 模拟处理延迟
    setTimeout(() => {
        // 隐藏加载状态
        if (window.ApexAI) {
            window.ApexAI.hideLoading();
        }

        // 显示处理结果
        displayProcessedImage();
        
        // 显示图像预览区域
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.style.display = 'block';
            imagePreview.scrollIntoView({ behavior: 'smooth' });
        }

        if (window.ApexAI) {
            window.ApexAI.showMessage('图像处理完成！', 'success');
        }
    }, 3000); // 模拟3秒处理时间
}

/**
 * 显示处理后的图像
 */
function displayProcessedImage() {
    const processedImage = document.getElementById('processedImage');
    if (processedImage) {
        // 根据不同的处理选项显示不同的结果
        let resultContent = '';
        
        switch (selectedProcessingOption) {
            case 'enhance':
                resultContent = `
                    <div style="
                        width: 100%;
                        max-width: 300px;
                        height: 300px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 16px;
                        font-weight: 500;
                        text-align: center;
                        padding: 20px;
                    ">
                        <div>
                            <div style="margin-bottom: 10px;">✨ 图像增强完成</div>
                            <div style="font-size: 14px; opacity: 0.8;">清晰度和质量已提升</div>
                        </div>
                    </div>
                `;
                break;
                
            case 'remove-bg':
                resultContent = `
                    <div style="
                        width: 100%;
                        max-width: 300px;
                        height: 300px;
                        background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 16px;
                        font-weight: 500;
                        text-align: center;
                        padding: 20px;
                    ">
                        <div>
                            <div style="margin-bottom: 10px;">✂️ 背景移除完成</div>
                            <div style="font-size: 14px; opacity: 0.8;">背景已智能移除</div>
                        </div>
                    </div>
                `;
                break;
                
            case 'style':
                resultContent = `
                    <div style="
                        width: 100%;
                        max-width: 300px;
                        height: 300px;
                        background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 16px;
                        font-weight: 500;
                        text-align: center;
                        padding: 20px;
                    ">
                        <div>
                            <div style="margin-bottom: 10px;">🎨 风格转换完成</div>
                            <div style="font-size: 14px; opacity: 0.8;">艺术风格已应用</div>
                        </div>
                    </div>
                `;
                break;
                
            case 'resize':
                resultContent = `
                    <div style="
                        width: 100%;
                        max-width: 300px;
                        height: 300px;
                        background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 16px;
                        font-weight: 500;
                        text-align: center;
                        padding: 20px;
                    ">
                        <div>
                            <div style="margin-bottom: 10px;">📏 尺寸调整完成</div>
                            <div style="font-size: 14px; opacity: 0.8;">图像尺寸已优化</div>
                        </div>
                    </div>
                `;
                break;
        }
        
        processedImage.innerHTML = resultContent;
    }
}

/**
 * 处理下载处理后的图像
 */
function handleDownloadProcessed() {
    if (window.ApexAI) {
        window.ApexAI.showMessage('下载功能开发中...', 'info');
    } else {
        alert('下载功能开发中...');
    }
}

/**
 * 处理重置
 */
function handleReset() {
    // 重置所有状态
    selectedFile = null;
    selectedProcessingOption = null;
    
    // 重置页面显示
    const processingOptions = document.getElementById('processingOptions');
    const imagePreview = document.getElementById('imagePreview');
    const originalImage = document.getElementById('originalImage');
    const processedImage = document.getElementById('processedImage');
    const imageInput = document.getElementById('imageInput');
    
    if (processingOptions) processingOptions.style.display = 'none';
    if (imagePreview) imagePreview.style.display = 'none';
    if (originalImage) originalImage.innerHTML = '<p style="color: var(--text-secondary);">原图将在这里显示</p>';
    if (processedImage) processedImage.innerHTML = '<p style="color: var(--text-secondary);">处理后的图像将在这里显示</p>';
    if (imageInput) imageInput.value = '';
    
    // 重置选项样式
    const options = ['enhanceOption', 'removeBgOption', 'styleOption', 'resizeOption'];
    options.forEach(optionId => {
        const element = document.getElementById(optionId);
        if (element) {
            element.style.border = '1px solid var(--border-color)';
            element.style.backgroundColor = 'white';
        }
    });
    
    if (window.ApexAI) {
        window.ApexAI.showMessage('已重置', 'info');
    }
}

/**
 * 验证文件类型
 */
function validateFileType(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    return allowedTypes.includes(file.type);
}

/**
 * 验证文件大小
 */
function validateFileSize(file, maxSize = 10 * 1024 * 1024) {
    return file.size <= maxSize;
} 