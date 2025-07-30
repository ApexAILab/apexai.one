/**
 * APICore API 调用模块
 * 处理图像生成相关的API请求
 */

/**
 * 生成随机边界字符串
 */
function generateBoundary() {
    return 'wL36Yn8afVp8Ag7AmP8qZ0SA4n1v9T' + Math.random().toString(36).substring(2);
}

/**
 * 将文件转换为Base64格式
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // 移除data:image/xxx;base64,前缀
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

/**
 * 构建multipart/form-data请求体
 */
function buildFormData(params, boundary) {
    const formData = [];
    
    // 添加image参数
    if (params.image) {
        formData.push(`--${boundary}`);
        formData.push('Content-Disposition: form-data; name=image;');
        formData.push('Content-Type: text/plain');
        formData.push('');
        formData.push(`file://${params.image}`);
    }
    
    // 添加mask参数
    if (params.mask) {
        formData.push(`--${boundary}`);
        formData.push('Content-Disposition: form-data; name=mask;');
        formData.push('Content-Type: text/plain');
        formData.push('');
        formData.push(`file://${params.mask}`);
    }
    
    // 添加prompt参数
    if (params.prompt) {
        formData.push(`--${boundary}`);
        formData.push('Content-Disposition: form-data; name=prompt;');
        formData.push('Content-Type: text/plain');
        formData.push('');
        formData.push(params.prompt);
    }
    
    // 添加n参数（生成数量）
    formData.push(`--${boundary}`);
    formData.push('Content-Disposition: form-data; name=n;');
    formData.push('Content-Type: text/plain');
    formData.push('');
    formData.push(params.n || '1');
    
    // 添加response_format参数
    formData.push(`--${boundary}`);
    formData.push('Content-Disposition: form-data; name=response_format;');
    formData.push('Content-Type: text/plain');
    formData.push('');
    formData.push(params.response_format || 'url');
    
    // 添加user参数
    formData.push(`--${boundary}`);
    formData.push('Content-Disposition: form-data; name=user;');
    formData.push('Content-Type: text/plain');
    formData.push('');
    formData.push(params.user || '');
    
    // 添加model参数
    formData.push(`--${boundary}`);
    formData.push('Content-Disposition: form-data; name=model;');
    formData.push('Content-Type: text/plain');
    formData.push('');
    formData.push(params.model || 'gpt-4o-image');
    
    // 结束边界
    formData.push(`--${boundary}--`);
    formData.push('');
    
    return formData.join('\r\n');
}

/**
 * 调用APICore图像生成API
 */
async function callAPICoreImageAPI(params) {
    try {
        console.log('开始调用APICore API，参数:', params);
        
        // 使用FormData对象来构建multipart/form-data
        const formData = new FormData();
        
        // 添加model参数（必须在最前面）
        formData.append('model', params.model || 'dall-e-3');
        console.log('添加model:', params.model || 'dall-e-3');
        
        // 添加prompt参数
        if (params.prompt) {
            formData.append('prompt', params.prompt);
            console.log('添加prompt:', params.prompt);
        }
        
        // 添加n参数（生成数量）
        formData.append('n', params.n || '1');
        console.log('添加n:', params.n || '1');
        
        // 添加response_format参数
        formData.append('response_format', params.response_format || 'url');
        console.log('添加response_format:', params.response_format || 'url');
        
        // 添加user参数
        formData.append('user', params.user || '');
        console.log('添加user:', params.user || '');
        
        // 根据是否有参考图片决定使用哪个API端点
        // 图像生成API不支持参考图片，图像编辑API支持参考图片
        // Sora模型支持参考图片，可以使用edits端点
        let apiEndpoint;
        if (params.imageFile) {
            // 有参考图片时，所有模型都使用edits端点
            apiEndpoint = 'https://api.apicore.ai/v1/images/edits';
            console.log('使用图像编辑API端点（支持参考图片）');
            
            // 添加图片文件
            formData.append('image', params.imageFile);
            console.log('添加image文件:', params.imageFile.name);
            
            // 图像编辑API不支持size参数
            console.log('图像编辑模式，不添加size参数');
        } else {
            // 无参考图片时，使用generations端点
            apiEndpoint = 'https://api.apicore.ai/v1/images/generations';
            console.log('使用图像生成API端点');
            
            // 添加size参数（图片尺寸）
            if (params.size) {
                formData.append('size', params.size);
                console.log('添加size:', params.size);
            }
        }
        
        // 如果有mask文件，添加到formData（仅用于图像编辑）
        if (params.maskFile && params.imageFile) {
            formData.append('mask', params.maskFile);
            console.log('添加mask文件:', params.maskFile.name);
        }
        
        console.log('发送请求到:', apiEndpoint);
        console.log('API Key:', params.apiKey ? '已设置' : '未设置');
        console.log('FormData内容:');
        for (let [key, value] of formData.entries()) {
            if (key === 'image' || key === 'mask') {
                console.log(`${key}: [文件] ${value.name} (${value.size} bytes)`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${params.apiKey}`
                // 注意：使用FormData时，不要手动设置Content-Type，浏览器会自动设置
            },
            body: formData
        });
        
        console.log('响应状态:', response.status);
        console.log('响应头:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API错误响应:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API响应数据:', data);
        return data;
        
    } catch (error) {
        console.error('API调用失败:', error);
        
        // 更详细的错误信息
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.error('网络请求失败，可能的原因：');
            console.error('1. 网络连接问题');
            console.error('2. CORS 跨域问题');
            console.error('3. API服务器不可用');
            console.error('4. 防火墙或代理阻止');
        }
        
        throw error;
    }
}

/**
 * 图像生成API调用（简化版本）
 */
async function generateImage(config) {
    try {
        // 将图片比例转换为API支持的尺寸格式
        const sizeMap = {
            '1:1': '1024x1024',
            '2:3': '1024x1536', 
            '3:2': '1536x1024'
        };
        
        // 准备API参数
        const apiParams = {
            apiKey: config.apiKey,
            prompt: config.prompt,
            n: config.generateCount.toString(),
            model: config.model,
            size: sizeMap[config.imageRatio] || '1024x1024', // 添加尺寸参数
            response_format: 'url',
            user: ''
        };
        
        // 如果有参考图片，添加到参数中
        if (config.referenceImages && config.referenceImages.length > 0) {
            // 使用第一个参考图片作为输入图片
            const firstImage = config.referenceImages[0];
            if (firstImage && firstImage.file) {
                apiParams.imageFile = firstImage.file;
            }
        }
        
        console.log('图像生成配置:', apiParams);
        
        // 调用API
        const result = await callAPICoreImageAPI(apiParams);
        return result;
        
    } catch (error) {
        console.error('图像生成失败:', error);
        throw error;
    }
}

/**
 * 上传图片到服务器（模拟函数）
 * 实际项目中需要实现真实的图片上传功能
 */
async function uploadImageToServer(file) {
    // 这里应该实现真实的图片上传逻辑
    // 暂时返回一个模拟的URL
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.readAsDataURL(file);
    });
}

/**
 * 处理API响应
 */
function handleAPIResponse(response) {
    if (response && response.data && response.data.length > 0) {
        return response.data[0].url; // 返回第一张生成的图片URL
    }
    throw new Error('API响应格式错误');
}

/**
 * 测试网络连接
 */
async function testNetworkConnection() {
    try {
        console.log('=== 网络连接测试开始 ===');
        
        // 测试基本网络连接
        console.log('1. 测试基本网络连接...');
        const testResponse = await fetch('https://httpbin.org/get', {
            method: 'GET',
            mode: 'cors'
        });
        
        if (testResponse.ok) {
            console.log('✅ 基本网络连接正常');
        } else {
            console.log('❌ 基本网络连接失败');
        }
        
        // 测试APICore服务器连接
        console.log('2. 测试APICore服务器连接...');
        try {
            const apiTestResponse = await fetch('https://api.apicore.ai/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer test-key'
                }
            });
            
            if (apiTestResponse.status === 401) {
                console.log('✅ APICore服务器可访问（认证失败是正常的）');
            } else if (apiTestResponse.status === 200) {
                console.log('✅ APICore服务器连接正常');
            } else {
                console.log(`❌ APICore服务器连接问题，状态码: ${apiTestResponse.status}`);
            }
        } catch (apiError) {
            console.log('❌ APICore服务器连接失败:', apiError.message);
        }
        
        // 测试CORS
        console.log('3. 测试CORS支持...');
        try {
            const corsTestResponse = await fetch('https://api.apicore.ai/v1/images/generations', {
                method: 'OPTIONS'
            });
            console.log('✅ CORS预检请求成功');
        } catch (corsError) {
            console.log('❌ CORS预检请求失败:', corsError.message);
        }
        
        console.log('=== 网络连接测试完成 ===');
        
    } catch (error) {
        console.error('❌ 网络连接测试失败:', error);
    }
}

/**
 * 验证API Key
 */
async function validateAPIKey(apiKey) {
    try {
        console.log('验证API Key...');
        
        const response = await fetch('https://api.apicore.ai/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        if (response.status === 200) {
            console.log('✅ API Key 有效');
            return true;
        } else if (response.status === 401) {
            console.log('❌ API Key 无效或已过期');
            return false;
        } else {
            console.log(`⚠️ API Key 验证状态码: ${response.status}`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ API Key 验证失败:', error);
        return false;
    }
}

// 导出函数供其他模块使用
window.APICoreAPI = {
    generateImage,
    callAPICoreImageAPI,
    uploadImageToServer,
    testNetworkConnection,
    validateAPIKey
}; 