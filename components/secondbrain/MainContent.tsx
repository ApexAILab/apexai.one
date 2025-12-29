"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Send,
  Tag,
  X,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Clock,
  MoreHorizontal,
} from "lucide-react";

interface MainContentProps {
  selectedDate: Date | null;
  selectedPostId: string | null;
  onRefresh?: () => void;
  searchQuery?: string; // 搜索关键词
}

interface Post {
  id: string;
  title: string | null;
  content: string;
  type: string;
  tags: string[];
  images: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 中间内容区组件
 * 包含：发布框 + 标签栏 + 瀑布流列表（完整内容）
 */
export function MainContent({ selectedDate, selectedPostId, onRefresh, searchQuery = "" }: MainContentProps) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null); // 内容容器的引用，用于滚动到顶部
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]); // 存储所有帖子（用于标签筛选）
  const [allTags, setAllTags] = useState<string[]>([]); // 存储所有标签（从所有帖子中提取）
  const [totalPosts, setTotalPosts] = useState(0); // 总帖子数（用于分页计算）
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null); // 选中的标签，null 表示"全部"
  const [showImagesOnly, setShowImagesOnly] = useState(false); // 是否只显示带图片的帖子
  
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1); // 当前页码（从1开始）
  const postsPerPage = 10; // 每页显示的帖子数量
  // 已发布帖子时间编辑相关状态
  const [editingTimePostId, setEditingTimePostId] = useState<string | null>(null);
  const [editingDateTime, setEditingDateTime] = useState("");
  const [savingTime, setSavingTime] = useState(false);
  // 已发布帖子操作菜单状态
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  // 已发布帖子编辑相关状态
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editingTagInput, setEditingTagInput] = useState("");
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [savingPost, setSavingPost] = useState(false);
  const [uploadingEditImages, setUploadingEditImages] = useState<Set<number>>(new Set());
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // 获取帖子列表（支持分页和搜索）
  const fetchPosts = async (page: number = 1) => {
    setLoading(true);

    try {
      const offset = (page - 1) * postsPerPage;
      let url = selectedDate
        ? `/api/posts?date=${selectedDate.toISOString().split('T')[0]}&limit=${postsPerPage}&offset=${offset}`
        : `/api/posts?limit=${postsPerPage}&offset=${offset}`;
      
      // 如果有搜索关键词，添加搜索参数（搜索时获取所有匹配的帖子，然后在客户端分页）
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
        // 搜索时，获取所有匹配的帖子
        url = url.replace(`limit=${postsPerPage}&offset=${offset}`, 'limit=10000&offset=0');
      }
      
      // 如果有标签筛选或图片筛选，获取所有数据（或足够多的数据）以便在客户端进行筛选
      if ((selectedTag || showImagesOnly) && !searchQuery.trim()) {
        url = url.replace(`limit=${postsPerPage}&offset=${offset}`, 'limit=10000&offset=0');
      }
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        // 确保数据格式正确
        const postsData = result.data || [];
        setAllPosts(postsData);
        // 保存总帖子数（用于分页计算）
        // 如果有搜索、标签筛选或图片筛选，使用当前数据长度
        if (searchQuery.trim() || selectedTag || showImagesOnly) {
          setTotalPosts(postsData.length);
        } else {
          // 如果没有搜索和标签筛选，使用 API 返回的 total（服务端分页）
          // API 应该返回 total 字段，表示数据库中的总帖子数
          const total = result.total;
          console.log('API 返回的 total:', total, 'postsData.length:', postsData.length);
          if (total !== undefined && total !== null) {
            setTotalPosts(total);
          } else {
            // 如果 API 没有返回 total，使用当前数据长度作为后备
            // 这种情况不应该发生，但作为后备方案
            console.warn('API 没有返回 total，使用当前数据长度作为后备');
            setTotalPosts(postsData.length);
          }
        }
      }
    } catch (error) {
      console.error('Fetch posts error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载时获取所有标签
  useEffect(() => {
    fetchAllTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 初始加载、日期变化或搜索关键词变化时重置并加载第一页
  useEffect(() => {
    setCurrentPage(1);
    fetchPosts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, searchQuery]);

  // 当标签或图片筛选变化时，从服务端获取所有数据以便进行客户端筛选
  useEffect(() => {
    if ((selectedTag || showImagesOnly) && !searchQuery.trim()) {
      fetchPosts(1); // 获取所有数据（limit=10000）
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTag, showImagesOnly]);

  // 当 allPosts、selectedTag 或 showImagesOnly 变化时，更新筛选后的帖子列表
  // 注意：搜索已经在服务端完成，这里只需要按标签和图片筛选
  useEffect(() => {
    let filtered = allPosts;

    // 按标签筛选
    if (selectedTag) {
      filtered = filtered.filter((post) => post.tags && post.tags.includes(selectedTag));
    }

    // 按图片筛选
    if (showImagesOnly) {
      filtered = filtered.filter((post) => {
        const hasImages = post.images && Array.isArray(post.images) && post.images.length > 0;
        return hasImages;
      });
    }

    setPosts(filtered);
  }, [allPosts, selectedTag, showImagesOnly]);

  // 当标签或图片筛选变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTag, showImagesOnly]);

  // 计算当前页显示的帖子
  const displayedPosts = useMemo(() => {
    // 如果没有搜索、标签筛选和图片筛选，使用服务端分页，allPosts 就是当前页的数据，直接返回
    if (!searchQuery.trim() && !selectedTag && !showImagesOnly) {
      return posts; // posts = allPosts（没有筛选时）
    }
    // 如果有搜索、标签筛选或图片筛选，使用客户端分页，需要从 posts 中切片
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    return posts.slice(startIndex, endIndex);
  }, [posts, currentPage, postsPerPage, searchQuery, selectedTag, showImagesOnly]);

  // 计算总页数
  const totalPages = useMemo(() => {
    // 如果有搜索、标签筛选或图片筛选，基于筛选后的帖子数量计算
    if (searchQuery.trim() || selectedTag || showImagesOnly) {
      const pages = Math.ceil(posts.length / postsPerPage);
      return pages > 0 ? pages : 1; // 至少显示1页
    }
    // 如果没有搜索和筛选，基于总帖子数计算（服务端分页）
    if (totalPosts > 0) {
      return Math.ceil(totalPosts / postsPerPage);
    }
    // 如果 totalPosts 为 0，但 allPosts 有数据，说明可能是初始加载，使用 allPosts 长度
    if (allPosts.length > 0) {
      return Math.ceil(allPosts.length / postsPerPage);
    }
    // 如果都没有，至少显示1页
    return 1;
  }, [posts.length, postsPerPage, totalPosts, searchQuery, selectedTag, showImagesOnly, allPosts.length]);

  // 当页码变化时，如果没有搜索、标签筛选或图片筛选，从服务端加载对应页的数据
  useEffect(() => {
    // 如果有搜索，不需要从服务端加载（搜索时已获取所有数据）
    if (searchQuery.trim()) {
      return;
    }

    // 如果有标签筛选或图片筛选，筛选在客户端完成，不需要从服务端加载
    if (selectedTag || showImagesOnly) {
      return;
    }

    // 如果没有搜索和筛选，每次翻页都从服务端加载对应页的数据
    // 注意：这里需要检查是否正在加载，避免重复请求
    if (!loading && currentPage > 0) {
      fetchPosts(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // 当页码变化时，滚动内容容器到顶部
  useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // 获取所有唯一的标签（从服务端获取所有帖子的标签）
  const fetchAllTags = async () => {
    try {
      // 获取所有帖子的标签（只获取 tags 字段，不获取完整内容）
      const response = await fetch('/api/posts?limit=10000&offset=0');
      const result = await response.json();
      if (result.success) {
        const postsData = result.data || [];
        const tagSet = new Set<string>();
        postsData.forEach((post: Post) => {
          const postTags = post.tags;
          if (postTags && Array.isArray(postTags) && postTags.length > 0) {
            postTags.forEach((tag: any) => {
              const tagStr = String(tag).trim();
              if (tagStr) {
                tagSet.add(tagStr);
              }
            });
          }
        });
        setAllTags(Array.from(tagSet).sort());
      }
    } catch (error) {
      console.error('Fetch all tags error:', error);
    }
  };

  /**
   * 已发布帖子：打开时间编辑面板
   * 使用 datetime-local 字段，精确到秒
   */
  const handleStartEditTime = (post: Post) => {
    const date = new Date(post.createdAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localValue = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

    setEditingTimePostId(post.id);
    setEditingDateTime(localValue);
  };

  /**
   * 已发布帖子：取消时间编辑
   */
  const handleCancelEditTime = () => {
    setEditingTimePostId(null);
    setEditingDateTime("");
    setSavingTime(false);
  };

  /**
   * 已发布帖子：保存修改后的时间到后端
   */
  const handleSaveEditTime = async (postId: string) => {
    if (!editingDateTime || savingTime) return;
    setSavingTime(true);
    try {
      const newDate = new Date(editingDateTime);
      if (Number.isNaN(newDate.getTime())) {
        alert("时间格式不正确，请重新输入");
        setSavingTime(false);
        return;
      }

      const payload = {
        id: postId,
        createdAt: newDate.toISOString(),
      };

      const response = await fetch("/api/posts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.success) {
        alert(result.error || "更新时间失败");
        setSavingTime(false);
        return;
      }

      const updated: Post = result.data;

      // 同步更新本地 allPosts 列表中的时间（posts 会通过 useEffect 自动更新）
      setAllPosts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, createdAt: updated.createdAt } : p))
      );

      handleCancelEditTime();
    } catch (error) {
      alert("更新时间失败，请重试");
      setSavingTime(false);
    }
  };

  /**
   * 已发布帖子：开始编辑帖子
   */
  const handleStartEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditingContent(post.content || "");
    setEditingTags(Array.isArray(post.tags) ? post.tags : []);
    setEditingTagInput("");
    setEditingImages(Array.isArray(post.images) ? post.images : []);
  };

  /**
   * 已发布帖子：取消编辑帖子
   */
  const handleCancelEditPost = () => {
    setEditingPostId(null);
    setEditingContent("");
    setEditingTags([]);
    setEditingTagInput("");
    setEditingImages([]);
    setSavingPost(false);
    setUploadingEditImages(new Set());
  };

  /**
   * 已发布帖子：添加编辑中的标签
   */
  const handleAddEditTag = () => {
    const trimmedTag = editingTagInput.trim();
    if (trimmedTag) {
      setEditingTags((prev) => [...prev, trimmedTag]);
      setEditingTagInput("");
    }
  };

  /**
   * 已发布帖子：删除编辑中的标签
   */
  const handleRemoveEditTag = (tag: string) => {
    setEditingTags((prev) => prev.filter((t) => t !== tag));
  };

  /**
   * 已发布帖子：删除编辑中的图片
   */
  const handleRemoveEditingImage = (index: number) => {
    setEditingImages((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * 已发布帖子：处理编辑中的图片文件选择并上传
   */
  const handleEditImageUpload = async (file: File, index: number) => {
    setUploadingEditImages((prev) => new Set(prev).add(index));
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.url) {
        setEditingImages((prev) => [...prev, result.url]);
      } else {
        throw new Error(result.error || '上传失败');
      }
    } catch (error) {
      console.error('Edit image upload error:', error);
      alert('图片上传失败，请重试');
    } finally {
      setUploadingEditImages((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  /**
   * 已发布帖子：处理编辑中的文件选择
   */
  const handleEditFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await handleEditImageUpload(file, i);
      }
    }

    // 清空 input，允许重复选择同一文件
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  /**
   * 已发布帖子：保存帖子编辑到后端
   */
  const handleSaveEditPost = async () => {
    if (!editingPostId || savingPost) return;
    if (!editingContent.trim() && editingImages.length === 0) {
      alert("内容或图片至少需要一项");
      return;
    }

    setSavingPost(true);
    try {
      // 确保 tags 是字符串数组，过滤空值
      const filteredTags = editingTags
        .filter((t) => t != null && String(t).trim())
        .map((t) => String(t).trim());
      
      // 如果输入框中还有未点击「添加」的标签，也一并收集
      const extraTag = editingTagInput.trim();
      if (extraTag) {
        filteredTags.push(extraTag);
      }

      const payload = {
        id: editingPostId,
        content: editingContent.trim(),
        tags: filteredTags,
        images: editingImages,
      };

      const response = await fetch("/api/posts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.success) {
        alert(result.error || "更新帖子失败");
        setSavingPost(false);
        return;
      }

      const updated: Post = result.data;

      // 同步更新本地 allPosts 列表（posts 会通过 useEffect 自动更新）
      setAllPosts((prev) =>
        prev.map((p) => 
          p.id === updated.id 
            ? { ...p, content: updated.content, tags: updated.tags, images: updated.images }
            : p
        )
      );

      // 重新获取所有标签（因为标签可能已更改）
      await fetchAllTags();
      handleCancelEditPost();
    } catch (error) {
      alert("更新帖子失败，请重试");
      setSavingPost(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    
    if (trimmedTag) {
      // 使用函数式更新，确保基于最新状态
      setTags((prevTags) => [...prevTags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prevTags) => prevTags.filter((t) => t !== tag));
  };

  const handleImageUpload = async (file: File, index: number) => {
    setUploadingImages((prev) => new Set(prev).add(index));
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.url) {
        setImages((prev) => [...prev, result.url]);
      } else {
        throw new Error(result.error || '上传失败');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('图片上传失败，请重试');
    } finally {
      setUploadingImages((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await handleImageUpload(file, i);
      }
    }

    // 清空 input，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 发布函数：接收参数，不依赖闭包
  const handlePublish = async (publishContent: string, publishImages: string[], publishTags: string[]) => {
    if ((!publishContent.trim() && publishImages.length === 0) || publishing) return;

    setPublishing(true);
    try {
      // 确保 tags 是字符串数组，过滤空值
      const filteredTags = publishTags
        .filter((t) => t != null && String(t).trim())
        .map((t) => String(t).trim());
      
      const payload = {
        content: publishContent.trim(),
        tags: filteredTags,
        images: publishImages,
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (result.success) {
        setContent("");
        setTags([]);
        setTagInput("");
        setImages([]);
        // 重置分页并重新加载第一页
        setCurrentPage(1);
        await fetchPosts(1);
        // 重新获取所有标签
        await fetchAllTags();
        onRefresh?.();
      } else {
        alert(result.error || '发布失败');
      }
      setPublishing(false);
    } catch (error) {
      alert('发布失败，请重试');
      setPublishing(false);
    }
  };

  /**
   * 发布按钮点击处理
   * 额外优化：如果输入框中还有未点击「添加」的标签（tagInput），也一并收集进 tags
   */
  const onPublishClick = () => {
    const extraTag = tagInput.trim();
    const mergedTags = extraTag ? [...tags, extraTag] : tags;

    // 如果自动收集了输入框中的标签，需要清空输入框
    if (extraTag) {
      setTagInput("");
    }

    handlePublish(content, images, mergedTags);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('确定要删除这条帖子吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts?id=${postId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        // 刷新帖子列表（重置分页并重新加载第一页）
        setCurrentPage(1);
        await fetchPosts(1);
        // 重新获取所有标签
        await fetchAllTags();
        // 通知父组件刷新左侧栏
        onRefresh?.();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-2 overflow-hidden">
      {/* 发布框 */}
      <div className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 p-4 shadow-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="记录你的想法..."
          className="w-full h-24 bg-transparent border-none outline-none resize-none text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        />
        {/* 图片预览区域 */}
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Upload ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-sm border border-zinc-200 dark:border-zinc-800"
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          {/* 图片上传和标签输入 */}
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-sm border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="上传图片"
            >
              {uploadingImages.size > 0 ? (
                <Loader2 size={14} className="animate-spin text-zinc-500" />
              ) : (
                <ImageIcon size={14} className="text-zinc-500 dark:text-zinc-400" />
              )}
            </button>
            <Tag size={14} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1 flex-1 min-w-[100px]">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="添加标签..."
                className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>
          <button
            onClick={onPublishClick}
            disabled={(!content.trim() && images.length === 0) || publishing}
            className="px-4 py-2 rounded-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            发布
          </button>
        </div>
      </div>

      {/* 标签筛选行 */}
      <div className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 p-3 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setSelectedTag(null);
              setShowImagesOnly(false);
            }}
            className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors whitespace-nowrap ${
              selectedTag === null && !showImagesOnly
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            全部
          </button>
          <button
            onClick={() => {
              setSelectedTag(null);
              setShowImagesOnly(true);
            }}
            className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors whitespace-nowrap ${
              showImagesOnly && selectedTag === null
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            图片
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setSelectedTag(tag);
                setShowImagesOnly(false);
              }}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors whitespace-nowrap ${
                selectedTag === tag && !showImagesOnly
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 瀑布流列表 */}
      <div ref={contentContainerRef} className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-400 dark:text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
            还没有帖子，开始记录你的想法吧
          </div>
        ) : (
          <>
            {displayedPosts.map((post) => {
            const postDate = new Date(post.createdAt);
            return (
              <div
                key={post.id}
                className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 p-3 shadow-sm hover:shadow-md transition-shadow relative group"
              >
                {/* 帖子操作菜单（修改时间 / 编辑图片 / 删除） */}
                <div className="absolute top-2 right-2 z-20">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setMenuPostId((prev) => (prev === post.id ? null : post.id))
                      }
                      className="p-1.5 rounded-sm bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="更多操作"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {menuPostId === post.id && (
                      <div className="absolute right-0 top-7 w-28 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm py-1 text-[11px] text-zinc-700 dark:text-zinc-300 z-30">
                        <button
                          onClick={() => {
                            setMenuPostId(null);
                            handleStartEditTime(post);
                          }}
                          className="w-full px-2 py-1 flex items-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <Clock size={11} />
                          <span>修改时间</span>
                        </button>
                      <button
                        onClick={() => {
                          setMenuPostId(null);
                          handleStartEditPost(post);
                        }}
                        className="w-full px-2 py-1 flex items-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <ImageIcon size={11} />
                        <span>编辑帖子</span>
                      </button>
                        <button
                          onClick={() => {
                            setMenuPostId(null);
                            handleDeletePost(post.id);
                          }}
                          className="w-full px-2 py-1 flex items-center gap-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 size={11} />
                          <span>删除</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {/* 发布时间显示 / 编辑 */}
                {editingTimePostId === post.id ? (
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="datetime-local"
                      step={1}
                      value={editingDateTime}
                      onChange={(e) => setEditingDateTime(e.target.value)}
                      className="flex-1 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-transparent px-2 py-1 text-[10px] text-zinc-700 dark:text-zinc-300"
                    />
                    <button
                      onClick={handleCancelEditTime}
                      className="px-2 py-1 rounded-sm text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleSaveEditTime(post.id)}
                      disabled={savingTime}
                      className="px-3 py-1 rounded-sm bg-zinc-900 dark:bg-white text-[10px] text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingTime ? "保存中..." : "保存时间"}
                    </button>
                  </div>
                ) : (
                  <div className="mb-2 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                    <span>
                      {postDate.toLocaleDateString()} {postDate.toLocaleTimeString()}
                    </span>
                  </div>
                )}
                <div className="text-sm text-zinc-900 dark:text-zinc-50 whitespace-pre-wrap leading-relaxed pr-8">
                  {post.content}
                </div>
                {post.images && Array.isArray(post.images) && post.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {post.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Post image ${index + 1}`}
                        className="max-w-full h-auto max-h-32 rounded-sm border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                        onClick={() => window.open(url, '_blank')}
                      />
                    ))}
                  </div>
                )}
                {Array.isArray(post.tags) && post.tags.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                    {post.tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-sm bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400"
                      >
                        {String(tag)}
                      </span>
                    ))}
                  </div>
                )}
                {/* 编辑帖子 */}
                {editingPostId === post.id && (
                  <div className="mt-3 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-3 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
                      <span>编辑帖子</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancelEditPost}
                          className="px-2 py-1 rounded-sm text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveEditPost}
                          disabled={savingPost || (!editingContent.trim() && editingImages.length === 0)}
                          className="px-3 py-1 rounded-sm bg-zinc-900 dark:bg-white text-[11px] text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {savingPost ? (
                            <>
                              <Loader2 size={11} className="animate-spin" />
                              <span>保存中...</span>
                            </>
                          ) : (
                            <span>保存</span>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* 内容输入框 */}
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      placeholder="编辑帖子内容..."
                      className="w-full h-24 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-sm px-2 py-1.5 outline-none resize-none text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                    />
                    
                    {/* 图片预览区域 */}
                    {editingImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editingImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Edit image ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-sm border border-zinc-200 dark:border-zinc-800"
                            />
                            <button
                              onClick={() => handleRemoveEditingImage(index)}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 图片上传和标签输入 */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        <input
                          type="file"
                          ref={editFileInputRef}
                          onChange={handleEditFileSelect}
                          accept="image/*"
                          multiple
                          className="hidden"
                        />
                        <button
                          onClick={() => editFileInputRef.current?.click()}
                          className="p-1.5 rounded-sm border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="上传图片"
                        >
                          {uploadingEditImages.size > 0 ? (
                            <Loader2 size={14} className="animate-spin text-zinc-500" />
                          ) : (
                            <ImageIcon size={14} className="text-zinc-500 dark:text-zinc-400" />
                          )}
                        </button>
                        <Tag size={14} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                        {editingTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300"
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveEditTag(tag)}
                              className="hover:text-zinc-900 dark:hover:text-zinc-50"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        <div className="flex items-center gap-1 flex-1 min-w-[100px]">
                          <input
                            type="text"
                            value={editingTagInput}
                            onChange={(e) => setEditingTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddEditTag();
                              }
                            }}
                            placeholder="添加标签..."
                            className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* 分页组件 */}
          {totalPages > 1 && (
            <div className="py-4 flex items-center justify-center gap-2">
              {/* 上一页按钮 */}
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                  }
                }}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              
              {/* 页码按钮 */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  // 显示逻辑：始终显示第一页和最后一页，当前页及其前后各2页
                  const showPage = 
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 2 && pageNum <= currentPage + 2);
                  
                  if (!showPage) {
                    // 如果当前页和上一页之间有间隔，显示省略号
                    if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                      return (
                        <span key={pageNum} className="px-2 text-zinc-400 dark:text-zinc-500 text-sm">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setCurrentPage(pageNum);
                      }}
                      className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
                        currentPage === pageNum
                          ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              {/* 下一页按钮 */}
              <button
                onClick={() => {
                  if (currentPage < totalPages) {
                    setCurrentPage(currentPage + 1);
                  }
                }}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
          
          {/* 显示当前页信息 */}
          {(posts.length > 0 || totalPosts > 0) && (
            <div className="py-2 text-center text-zinc-400 dark:text-zinc-500 text-xs">
              第 {currentPage} 页，共 {totalPages} 页，共 {searchQuery.trim() || selectedTag || showImagesOnly ? posts.length : totalPosts} 条帖子
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
