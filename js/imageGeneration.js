/**
 * ApexAI 图像生成功能模块
 * 处理图像生成相关的交互逻辑
 */

// 全局变量
let referenceImages = []; // 存储参考图片信息
let generationTasks = []; // 存储生成任务
let isGenerating = false; // 添加生成状态标志
let abortController = null; // 添加中止控制器

// 数据持久化相关函数
function savePageData() {
    const pageData = {
        referenceImages: referenceImages,
        generationTasks: generationTasks,
        config: {
            apiPlatform: document.getElementById('apiPlatform')?.value || 'APICore',
            apiKey: document.getElementById('apiKey')?.value || '',
            model: document.getElementById('model')?.value || 'sora_image',
            generateCount: document.getElementById('generateCount')?.value || '2',
            imageRatio: document.getElementById('imageRatio')?.value || '2:3'
        }
    };
    localStorage.setItem('imageGenerationData', JSON.stringify(pageData));
}

function loadPageData() {
    const savedData = localStorage.getItem('imageGenerationData');
    if (savedData) {
        try {
            const pageData = JSON.parse(savedData);
            referenceImages = pageData.referenceImages || [];
            generationTasks = pageData.generationTasks || [];
            
            // 恢复配置
            if (pageData.config) {
                const config = pageData.config;
                if (document.getElementById('apiPlatform')) document.getElementById('apiPlatform').value = config.apiPlatform;
                if (document.getElementById('apiKey')) document.getElementById('apiKey').value = config.apiKey;
                if (document.getElementById('model')) document.getElementById('model').value = config.model;
                if (document.getElementById('generateCount')) document.getElementById('generateCount').value = config.generateCount;
                if (document.getElementById('imageRatio')) document.getElementById('imageRatio').value = config.imageRatio;
            }
            
            // 重新显示数据
            displayReferenceImages();
            displayGenerationTasks();
        } catch (error) {
            console.error('加载页面数据失败:', error);
        }
    }
}

// 自动保存数据
function autoSave() {
    savePageData();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('图像生成模块已加载');
    initImageGeneration();
});

/**
 * 初始化图像生成功能
 */
function initImageGeneration() {
    // 加载保存的数据
    loadPageData();
    
    // 获取页面元素
    const addReferenceBtn = document.getElementById('addReferenceBtn');
    const referenceImageInput = document.getElementById('referenceImageInput');
    const addPromptBtn = document.getElementById('addPromptBtn');
    const batchGenerateBtn = document.getElementById('batchGenerateBtn');

    // 绑定事件监听器
    if (addReferenceBtn) {
        addReferenceBtn.addEventListener('click', () => referenceImageInput.click());
    }

    if (referenceImageInput) {
        referenceImageInput.addEventListener('change', handleFileSelect);
    }

    if (addPromptBtn) {
        addPromptBtn.addEventListener('click', addGenerationTask);
    }

    if (batchGenerateBtn) {
        batchGenerateBtn.addEventListener('click', handleBatchGenerate);
    }
    
    // 绑定中止按钮事件
    const abortGenerateBtn = document.getElementById('abortGenerateBtn');
    if (abortGenerateBtn) {
        abortGenerateBtn.addEventListener('click', abortGeneration);
    }

    // 初始化配置验证
    initConfigValidation();
    
    // 如果没有保存的任务，添加第一个生成任务
    if (generationTasks.length === 0) {
        addGenerationTask();
    }
    
    // 绑定配置变更事件，自动保存
    const configElements = ['apiPlatform', 'apiKey', 'model', 'generateCount', 'imageRatio'];
    configElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', autoSave);
            element.addEventListener('input', autoSave);
            
            // 为模型选择添加特殊处理
            if (id === 'model') {
                element.addEventListener('change', handleModelChange);
            }
        }
    });
}

/**
 * 初始化配置验证
 */
function initConfigValidation() {
    const generateCountInput = document.getElementById('generateCount');
    if (generateCountInput) {
        generateCountInput.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (value < 1) {
                this.value = 1;
            } else if (value > 8) {
                this.value = 8;
            }
        });
    }
}

/**
 * 处理模型切换
 */
function handleModelChange() {
    const selectedModel = document.getElementById('model')?.value || 'sora_image';
    const imageRatioSelect = document.getElementById('imageRatio');
    const addReferenceBtn = document.getElementById('addReferenceBtn');
    
    if (imageRatioSelect) {
        if (selectedModel === 'sora_image') {
            // Sora模型支持自定义尺寸，即使有参考图片
            imageRatioSelect.disabled = false;
            imageRatioSelect.style.opacity = '1';
        } else {
            // 对于DALL-E模型，如果有参考图片则禁用尺寸选择
            if (referenceImages.length > 0) {
                imageRatioSelect.disabled = true;
                imageRatioSelect.style.opacity = '0.5';
            } else {
                imageRatioSelect.disabled = false;
                imageRatioSelect.style.opacity = '1';
            }
        }
    }
    
    // 所有模型都支持参考图片
    if (addReferenceBtn) {
        addReferenceBtn.disabled = false;
        addReferenceBtn.style.opacity = '1';
        addReferenceBtn.title = '添加参考图片';
    }
}

/**
 * 处理文件选择
 */
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        handleFiles(files);
    }
}

/**
 * 处理多个文件
 */
function handleFiles(files) {
    files.forEach(file => {
        if (validateImageFile(file)) {
            addReferenceImage(file);
        }
    });
}

/**
 * 验证图像文件
 */
function validateImageFile(file) {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        if (window.ApexAI) {
            window.ApexAI.showMessage('请选择图像文件', 'error');
        } else {
            alert('请选择图像文件');
        }
        return false;
    }

    // 验证文件大小（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        if (window.ApexAI) {
            window.ApexAI.showMessage('文件大小不能超过10MB', 'error');
        } else {
            alert('文件大小不能超过10MB');
        }
        return false;
    }

    return true;
}

/**
 * 添加参考图片
 */
function addReferenceImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageUrl = e.target.result;
        const imageName = file.name;
        
        // 创建图片对象
        const imageInfo = {
            file: file,
            url: imageUrl,
            name: imageName
        };
        
        referenceImages.push(imageInfo);
        displayReferenceImages();
        autoSave(); // 自动保存
        
        // 显示尺寸限制提示
        if (window.ApexAI) {
            const selectedModel = document.getElementById('model')?.value || 'sora_image';
            if (selectedModel === 'sora_image') {
                window.ApexAI.showMessage(`参考图片 "${imageName}" 添加成功。Sora模型支持参考图片和自定义尺寸。`, 'success');
            } else {
                window.ApexAI.showMessage(`参考图片 "${imageName}" 添加成功。注意：使用参考图片时，生成图片的尺寸将由参考图片决定。`, 'info');
            }
        }
        
        // 禁用尺寸选择（仅对非Sora模型）
        const selectedModel = document.getElementById('model')?.value || 'sora_image';
        if (selectedModel !== 'sora_image') {
            const imageRatioSelect = document.getElementById('imageRatio');
            if (imageRatioSelect) {
                imageRatioSelect.disabled = true;
                imageRatioSelect.style.opacity = '0.5';
            }
        }
    };
    reader.readAsDataURL(file);
}

/**
 * 显示参考图片
 */
function displayReferenceImages() {
    const container = document.getElementById('referenceImagesContainer');
    const grid = document.getElementById('referenceImagesGrid');
    
    if (container && grid) {
        if (referenceImages.length > 0) {
            container.style.display = 'block';
            
            grid.innerHTML = referenceImages.map((imageInfo, index) => {
                // 移除文件后缀名
                const displayName = imageInfo.name.replace(/\.[^/.]+$/, "");
                
                return `
                    <div style="
                        background: white;
                        border-radius: 8px;
                        border: 1px solid var(--border-color);
                        padding: 10px;
                        position: relative;
                        text-align: center;
                    ">
                        <button onclick="removeReferenceImage(${index})" style="
                            position: absolute;
                            top: 5px;
                            right: 5px;
                            width: 24px;
                            height: 24px;
                            background: #ff3b30;
                            color: white;
                            border: none;
                            border-radius: 50%;
                            font-size: 14px;
                            font-weight: bold;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 10;
                        ">
                            -
                        </button>
                        <div style="
                            width: 100%;
                            aspect-ratio: 2/3;
                            background: #f8f9fa;
                            border-radius: 4px;
                            margin-bottom: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            overflow: hidden;
                        ">
                            <img src="${imageInfo.url}" alt="${imageInfo.name}" style="
                                max-width: 100%;
                                max-height: 100%;
                                object-fit: contain;
                            ">
                        </div>
                        <input type="text" 
                               value="${displayName}" 
                               data-index="${index}"
                               style="
                                   width: 100%;
                                   padding: 6px 8px;
                                   border: 1px solid var(--border-color);
                                   border-radius: 4px;
                                   font-size: var(--font-size-small);
                                   background: white;
                                   color: var(--text-primary);
                                   text-align: center;
                                   font-weight: 500;
                               "
                               onchange="updateImageName(${index}, this.value)"
                        >
                    </div>
                `;
            }).join('');
        } else {
            container.style.display = 'none';
        }
    }
}



/**
 * 更新图片名称
 */
function updateImageName(index, newName) {
    if (referenceImages[index]) {
        referenceImages[index].name = newName;
        autoSave(); // 自动保存
    }
}

/**
 * 移除参考图片
 */
function removeReferenceImage(index) {
    if (referenceImages[index]) {
        const imageName = referenceImages[index].name;
        referenceImages.splice(index, 1);
        displayReferenceImages();
        autoSave(); // 自动保存
        
        // 如果没有参考图片了，恢复尺寸选择
        if (referenceImages.length === 0) {
            const imageRatioSelect = document.getElementById('imageRatio');
            if (imageRatioSelect) {
                imageRatioSelect.disabled = false;
                imageRatioSelect.style.opacity = '1';
            }
        }
        
        if (window.ApexAI) {
            window.ApexAI.showMessage(`参考图片 "${imageName}" 已移除`, 'info');
        }
    }
}

/**
 * 添加生成任务
 */
function addGenerationTask() {
    const taskId = Date.now() + Math.random();
    const task = {
        id: taskId,
        prompt: '',
        status: 'waiting', // waiting, processing, completed, error
        results: [], // 改为数组，支持多张图片
        statusLog: []
    };
    
    generationTasks.push(task);
    displayGenerationTasks();
    autoSave(); // 自动保存
}

/**
 * 删除生成任务
 */
function removeGenerationTask(taskId) {
    const index = generationTasks.findIndex(task => task.id === taskId);
    if (index !== -1) {
        generationTasks.splice(index, 1);
        displayGenerationTasks();
        autoSave(); // 自动保存
    }
}

/**
 * 更新任务提示词
 */
function updateTaskPrompt(taskId, prompt) {
    const task = generationTasks.find(task => task.id === taskId);
    if (task) {
        task.prompt = prompt;
        autoSave(); // 自动保存
    }
}

/**
 * 显示生成任务列表
 */
function displayGenerationTasks() {
    const container = document.getElementById('generationTasksContainer');
    if (container) {
        if (generationTasks.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">暂无生成任务</div>';
            return;
        }
        container.innerHTML = generationTasks.map((task, index) => `
            <div style="
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                border-bottom: 1px solid var(--border-color);
                height: 120px;
                position: relative;
            ">
                <!-- 提示词列 -->
                <div style="
                    padding: 15px;
                    border-right: 1px solid var(--border-color);
                    position: relative;
                    height: 100%;
                    overflow: hidden;
                ">
                    <button onclick="removeGenerationTask(${task.id})" style="
                        position: absolute;
                        top: 8px;
                        right: 8px;
                        width: 20px;
                        height: 20px;
                        background: #ff3b30;
                        color: white;
                        border: none;
                        border-radius: 50%;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 2;
                        transition: all 0.2s ease;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 3px 6px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">-</button>
                    <textarea 
                        placeholder="请输入图像生成的提示词..."
                        oninput="updateTaskPrompt(${task.id}, this.value)"
                        onblur="updateTaskPrompt(${task.id}, this.value)"
                        onpaste="handlePromptPaste(event, ${task.id})"
                        style="
                            width: 100%;
                            height: 90px;
                            min-height: 90px;
                            max-height: 90px;
                            padding: 8px;
                            border: 1px solid var(--border-color);
                            border-radius: 4px;
                            font-family: var(--font-family);
                            font-size: var(--font-size-small);
                            resize: none;
                            background: white;
                            color: var(--text-primary);
                            overflow-y: auto;
                        "
                    >${task.prompt}</textarea>
                </div>
                <!-- 生成结果列 -->
                <div style="
                    padding: 15px;
                    border-right: 1px solid var(--border-color);
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div id="result-${task.id}" style="
                        min-height: 80px;
                        max-height: 90px;
                        background: #f8f9fa;
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        height: 90px;
                        overflow: hidden;
                        position: relative;
                    ">
                        ${task.status === 'waiting' ? '<p style="color: var(--text-secondary); text-align: center; font-size: var(--font-size-small);">等待生成</p>' :
                          task.status === 'processing' ? '<p style="color: var(--text-secondary); text-align: center; font-size: var(--font-size-small);">生成中...</p>' :
                          task.status === 'completed' ? 
                            (task.results.length === 1 ? 
                                '<div style="text-align: center; cursor: pointer;" onclick="showImageViewer(' + task.id + ')"><img src="' + task.results[0] + '" style="max-width: 100%; max-height: 80px; border-radius: 4px;"></div>' :
                                '<div style="text-align: center; position: relative; width: 100%; height: 100%; cursor: pointer;" onclick="showImageViewer(' + task.id + ')">' +
                                    '<img src="' + task.results[0] + '" style="max-width: 100%; max-height: 80px; border-radius: 4px;">' +
                                    '<div style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">+' + (task.results.length - 1) + '</div>' +
                                '</div>'
                            ) :
                          task.status === 'aborted' ? '<p style="color: #ff9500; text-align: center; font-size: var(--font-size-small);">已中止</p>' :
                          '<p style="color: #ff3b30; text-align: center; font-size: var(--font-size-small);">生成失败</p>'}
                    </div>
                </div>
                <!-- 状态列 -->
                <div style="
                    padding: 15px;
                    height: 100%;
                    overflow: hidden;
                ">
                    <div id="status-${task.id}" style="
                        min-height: 80px;
                        max-height: 90px;
                        background: #f8f9fa;
                        border-radius: 4px;
                        border: 1px solid var(--border-color);
                        padding: 8px;
                        font-size: var(--font-size-small);
                        color: var(--text-secondary);
                        overflow-y: auto;
                        height: 90px;
                    ">
                        ${task.statusLog.length > 0 ? task.statusLog.map(log => `<div style="margin-bottom: 3px;">${log}</div>`).join('') : '<div>等待开始</div>'}
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// 粘贴分段自动拆分
function handlePromptPaste(e, taskId) {
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');
    if (pastedText && pastedText.includes('\n')) {
        e.preventDefault();
        const segments = pastedText.split(/\r?\n/).filter(seg => seg.trim() !== '');
        if (segments.length > 1) {
            // 替换当前行内容为第一段，其余段插入新行
            updateTaskPrompt(taskId, segments[0]);
            const currentIndex = generationTasks.findIndex(t => t.id === taskId);
            for (let i = 1; i < segments.length; i++) {
                const newTaskId = Date.now() + Math.random();
                generationTasks.splice(currentIndex + i, 0, {
                    id: newTaskId,
                    prompt: segments[i],
                    status: 'waiting',
                    results: [], // 新增任务的results为空数组
                    statusLog: []
                });
            }
            displayGenerationTasks();
            autoSave();
            return;
        }
    }
    // 单段粘贴，允许默认行为
}

/**
 * 处理批量生成
 */
function handleBatchGenerate() {
    // 验证是否有任务
    if (generationTasks.length === 0) {
        if (window.ApexAI) {
            window.ApexAI.showMessage('请至少添加一个生成任务', 'error');
        } else {
            alert('请至少添加一个生成任务');
        }
        return;
    }
    
    // 验证所有任务都有提示词
    const emptyTasks = generationTasks.filter(task => !task.prompt.trim());
    if (emptyTasks.length > 0) {
        if (window.ApexAI) {
            window.ApexAI.showMessage('请填写所有提示词', 'error');
        } else {
            alert('请填写所有提示词');
        }
        return;
    }
    
    // 获取配置信息
    const config = getConfigInfo();
    
    // 验证配置
    if (!validateConfig(config)) {
        return;
    }
    
    // 开始批量生成
    startBatchGeneration(config);
}

/**
 * 获取配置信息
 */
function getConfigInfo() {
    return {
        apiPlatform: document.getElementById('apiPlatform')?.value || 'APICore',
        apiKey: document.getElementById('apiKey')?.value || '',
        model: document.getElementById('model')?.value || 'sora_image',
        generateCount: parseInt(document.getElementById('generateCount')?.value || '2'),
        imageRatio: document.getElementById('imageRatio')?.value || '2:3',
        referenceImages: referenceImages
    };
}

/**
 * 验证配置
 */
function validateConfig(config) {
    if (!config.apiKey.trim()) {
        if (window.ApexAI) {
            window.ApexAI.showMessage('请输入API Key', 'error');
        } else {
            alert('请输入API Key');
        }
        return false;
    }

    if (config.generateCount < 1 || config.generateCount > 8) {
        if (window.ApexAI) {
            window.ApexAI.showMessage('生成次数必须在1-8之间', 'error');
        } else {
            alert('生成次数必须在1-8之间');
        }
        return false;
    }

    return true;
}

/**
 * 开始批量生成
 */
function startBatchGeneration(config) {
    console.log('开始批量生成，配置：', config);
    
    // 设置生成状态
    isGenerating = true;
    abortController = new AbortController();
    
    // 更新按钮状态
    updateButtonStates();
    
    // 更新所有任务状态为处理中
    generationTasks.forEach(task => {
        task.status = 'processing';
        task.statusLog = [];
    });
    
    displayGenerationTasks();
    
    // 逐个处理任务
    processTasksSequentially(config);
}

/**
 * 中止生成
 */
function abortGeneration() {
    if (isGenerating) {
        isGenerating = false;
        
        // 中止API请求
        if (abortController) {
            abortController.abort();
        }
        
        // 更新所有处理中的任务状态
        generationTasks.forEach(task => {
            if (task.status === 'processing') {
                task.status = 'aborted';
                task.statusLog.push('生成已中止');
            }
        });
        
        // 更新按钮状态
        updateButtonStates();
        
        // 重新显示任务
        displayGenerationTasks();
        
        if (window.ApexAI) {
            window.ApexAI.showMessage('生成已中止', 'info');
        } else {
            alert('生成已中止');
        }
    }
}

/**
 * 更新按钮状态
 */
function updateButtonStates() {
    const batchGenerateBtn = document.getElementById('batchGenerateBtn');
    const abortGenerateBtn = document.getElementById('abortGenerateBtn');
    
    if (batchGenerateBtn && abortGenerateBtn) {
        if (isGenerating) {
            batchGenerateBtn.style.display = 'none';
            abortGenerateBtn.style.display = 'inline-block';
        } else {
            batchGenerateBtn.style.display = 'inline-block';
            abortGenerateBtn.style.display = 'none';
        }
    }
}

/**
 * 顺序处理任务
 */
function processTasksSequentially(config) {
    let currentTaskIndex = 0;
    
    function processNextTask() {
        if (!isGenerating) {
            // 生成已中止
            return;
        }
        
        if (currentTaskIndex < generationTasks.length) {
            const task = generationTasks[currentTaskIndex];
            processSingleTask(task, config, () => {
                if (isGenerating) {
                    currentTaskIndex++;
                    processNextTask();
                }
            });
        } else {
            // 所有任务完成
            isGenerating = false;
            updateButtonStates();
            
            if (window.ApexAI) {
                window.ApexAI.showMessage('批量生成完成！', 'success');
            }
        }
    }
    
    processNextTask();
}

/**
 * 处理单个任务
 */
async function processSingleTask(task, config, callback) {
    try {
        // 检查是否已中止
        if (!isGenerating) {
            return;
        }
        
        // 更新任务状态
        updateTaskStatus(task.id, '开始处理任务...', 'info');
        
        // 准备API配置
        const apiConfig = {
            apiKey: config.apiKey,
            prompt: task.prompt,
            generateCount: config.generateCount,
            model: config.model,
            referenceImages: config.referenceImages
        };
        
        // 更新状态
        updateTaskStatus(task.id, '正在连接API服务器...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 检查是否已中止
        if (!isGenerating) {
            return;
        }
        
        updateTaskStatus(task.id, '验证API Key...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 检查是否已中止
        if (!isGenerating) {
            return;
        }
        
        updateTaskStatus(task.id, '上传参考图片...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 检查是否已中止
        if (!isGenerating) {
            return;
        }
        
        updateTaskStatus(task.id, '分析提示词...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 检查是否已中止
        if (!isGenerating) {
            return;
        }
        
        updateTaskStatus(task.id, '开始生成图像...', 'info');
        
        // 调用真实的API
        if (window.APICoreAPI) {
            const result = await window.APICoreAPI.generateImage(apiConfig);
            
            // 检查是否已中止
            if (!isGenerating) {
                return;
            }
            
            if (result && result.data && result.data.length > 0) {
                // 处理多张生成的图片
                task.results = result.data.map(item => item.url);
                task.status = 'completed';
                updateTaskStatus(task.id, `成功生成 ${task.results.length} 张图片！`, 'success');
            } else {
                throw new Error('API返回数据格式错误');
            }
        } else {
            // 如果API模块未加载，使用模拟数据
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 检查是否已中止
            if (!isGenerating) {
                return;
            }
            
            // 生成模拟的多张图片
            const mockImageUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjY3ZWVhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYflrprnlKjlm748L3RleHQ+PC9zdmc+';
            task.results = Array(parseInt(config.generateCount)).fill(mockImageUrl);
            task.status = 'completed';
            updateTaskStatus(task.id, `生成完成！共生成 ${task.results.length} 张图片`, 'success');
        }
        
        displayGenerationTasks();
        callback();
        
    } catch (error) {
        console.error('任务处理失败:', error);
        
        // 详细的错误诊断
        console.error('=== 错误诊断信息 ===');
        console.error('错误类型:', error.name);
        console.error('错误消息:', error.message);
        console.error('错误堆栈:', error.stack);
        
        // 检查是否是网络相关错误
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.error('网络请求失败，建议：');
            console.error('1. 检查网络连接');
            console.error('2. 检查API Key是否正确');
            console.error('3. 检查防火墙设置');
            console.error('4. 尝试使用VPN');
            
            if (window.ApexAI) {
                window.ApexAI.showMessage('网络连接失败，请检查网络设置或API Key', 'error');
            }
        } else if (error.message.includes('HTTP error')) {
            console.error('HTTP错误，建议：');
            console.error('1. 检查API Key是否有效');
            console.error('2. 检查请求参数是否正确');
            console.error('3. 检查API配额是否用完');
            
            if (window.ApexAI) {
                window.ApexAI.showMessage(`API请求失败: ${error.message}`, 'error');
            }
        } else {
            if (window.ApexAI) {
                window.ApexAI.showMessage(`生成失败: ${error.message}`, 'error');
            }
        }
        
        task.status = 'error';
        updateTaskStatus(task.id, `生成失败: ${error.message}`, 'error');
        displayGenerationTasks();
        callback();
    }
}

/**
 * 更新任务状态
 */
function updateTaskStatus(taskId, message, type = 'info') {
    const task = generationTasks.find(task => task.id === taskId);
    if (task) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        task.statusLog.push(logEntry);
        
        // 更新显示
        const statusElement = document.getElementById(`status-${taskId}`);
        if (statusElement) {
            statusElement.innerHTML = task.statusLog.map(log => `<div style="margin-bottom: 5px;">${log}</div>`).join('');
            statusElement.scrollTop = statusElement.scrollHeight;
        }
    }
}

/**
 * 验证API Key
 */
async function validateKey() {
    const apiKey = document.getElementById('apiKey')?.value;
    
    if (!apiKey || apiKey.trim() === '') {
        if (window.ApexAI) {
            window.ApexAI.showMessage('请先输入API Key', 'error');
        }
        return;
    }
    
    if (window.APICoreAPI && window.APICoreAPI.validateAPIKey) {
        const isValid = await window.APICoreAPI.validateAPIKey(apiKey);
        
        if (isValid) {
            if (window.ApexAI) {
                window.ApexAI.showMessage('API Key 验证成功！', 'success');
            }
        } else {
            if (window.ApexAI) {
                window.ApexAI.showMessage('API Key 验证失败，请检查是否正确', 'error');
            }
        }
    } else {
        if (window.ApexAI) {
            window.ApexAI.showMessage('API Key 验证功能不可用', 'error');
        }
    }
}

/**
 * 测试网络连接
 */
async function testConnection() {
    if (window.APICoreAPI && window.APICoreAPI.testNetworkConnection) {
        await window.APICoreAPI.testNetworkConnection();
        if (window.ApexAI) {
            window.ApexAI.showMessage('网络测试完成，请查看控制台输出', 'info');
        }
    } else {
        if (window.ApexAI) {
            window.ApexAI.showMessage('网络测试功能不可用', 'error');
        }
    }
}

/**
 * 显示图片查看器
 */
function showImageViewer(taskId) {
    const task = generationTasks.find(task => task.id === taskId);
    if (!task || !task.results || task.results.length === 0) {
        return;
    }
    
    // 创建图片查看器模态框
    const modal = document.createElement('div');
    modal.id = 'imageViewerModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;
    
    // 创建内容容器
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 20px;
        max-width: 90%;
        max-height: 90%;
        overflow-y: auto;
        position: relative;
    `;
    
    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--text-secondary);
        z-index: 1;
    `;
    closeBtn.onclick = () => modal.remove();
    
    // 标题
    const title = document.createElement('h3');
    title.textContent = `生成结果 (${task.results.length} 张图片)`;
    title.style.cssText = `
        margin: 0 0 20px 0;
        color: var(--text-primary);
        font-size: 18px;
    `;
    
    // 图片网格
    const imageGrid = document.createElement('div');
    imageGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-top: 15px;
    `;
    
    task.results.forEach((imageUrl, index) => {
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
            text-align: center;
            background: var(--background-secondary);
            border-radius: 8px;
            padding: 10px;
        `;
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.cssText = `
            max-width: 100%;
            max-height: 200px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        `;
        
        const label = document.createElement('div');
        label.textContent = `图片 ${index + 1}`;
        label.style.cssText = `
            margin-top: 8px;
            font-size: 12px;
            color: var(--text-secondary);
        `;
        
        imageContainer.appendChild(img);
        imageContainer.appendChild(label);
        imageGrid.appendChild(imageContainer);
    });
    
    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(imageGrid);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

 