/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Edit3, 
  Download, 
  Palette, 
  LayoutTemplate,
  Printer,
  Sparkles,
  Loader2,
  Wand2,
  Trash2,
  Save,
  Plus,
  Settings2,
  Undo2,
  Redo2,
  Type as TypeIcon,
  Columns,
  Minus,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Image as ImageIcon,
  CheckCircle2,
  History,
  Languages,
  Layout,
  ExternalLink,
  Circle,
  ShieldAlert,
  ShieldCheck,
  Key,
  Terminal
} from 'lucide-react';
import TurndownService from 'turndown';
import { analyzeResumeTemplate, CustomThemeConfig, polishResumeContent } from './services/templateAnalyzer';

const DEFAULT_MARKDOWN = `# 个人简历 *Personal resume*

<img src="https://picsum.photos/seed/avatar/200/280" alt="头像" />

## 基本信息

| | |
| :--- | :--- |
| **姓 名：** 史菁昊 | **年 龄：** 23 |
| **联系方式：** 13521062578 | **求职意向：** 后端工程师 |
| **电子邮箱：** 1154269073@qq.com | **所在城市：** 北京市 |

## 教育背景

| | | |
| :--- | :--- | :--- |
| **2022.09 - 2026.06** | **北京工业大学耿丹学院** | **计算机科学与技术 本科** |

**主修课程：** 掌握数据结构、单片机开发、web 应用技术、操作系统、计算机网络、数据库原理、软件工程等。

**专业排名前 15%**

## 技术栈

- **前端技术：** 精通 Vue.js、React + TypeScript 进行组件化开发，实现响应式布局；熟练掌握 HTML/CSS、Tailwind CSS 进行页面布局、样式设计和动画效果制作；掌握 Three.js 进行 Web 3D 可视化开发；熟悉 ES6+ 语法、DOM 操作及浏览器兼容处理，能够高效开发出高质量的前端页面。
- **后端技术：** 具备 Spring Boot、Express.js 开发能力，可构建 RESTful API；熟悉 JWT、AES 加密等认证机制，保障系统安全；掌握 MyBatis-Plus 操作 MySQL 数据库，以及 SQLite、Room 等数据库方案，进行数据库设计与优化；熟悉 WebSocket 实时通信与工业通信协议。

## 项目经历

**项目 1：智能手术床 Android 控制系统（2025.10 – 2026.4）项目负责人**

- 基于 Kotlin + Android 进行客户端开发，采用 Clean Architecture + MVVM 架构完成业务分层设计，结合 Hilt 实现依赖注入，提升系统可维护性与模块解耦能力。
- 使用 Room、DataStore 实现设备状态、用户信息、操作日志及预设姿态数据管理，结合协议完成设备指令下发与状态回传。

**项目成果：** 完成手术床核心控制、安全认证与状态监测等功能开发，形成较完整的医疗设备移动端控制方案。

## 荣誉证书

- 全国计算机等级考试（四级）（2026.01）
- “2023 年第五届全国高校计算机能力挑战赛” Excel 项目本研组全国决赛一等奖（2023.01）

## 自我评价

- **职业背景：** 对 Web 前端及全栈开发充满热情，具备扎实的专业知识和丰富的项目经验，熟悉敏捷开发流程。
- **沟通能力：** 拥有良好的跨部门协作与沟通能力，能够与内部团队及外部合作伙伴紧密配合。
`;

type Theme = 'modern' | 'classic' | 'minimal' | 'pdf' | 'ai-custom';
type SidebarPanel = 'content' | 'template' | 'ai' | 'settings';
type AIProvider = 'deepseek' | 'doubao' | 'openai' | 'gemini';

interface AIConfig {
  apiKey: string;
  modelId: string;
}

const PROVIDER_INFO: Record<AIProvider, { name: string; setupUrl: string; icon: any; color: string }> = {
  deepseek: { name: 'DeepSeek', setupUrl: 'https://platform.deepseek.com/', icon: Sparkles, color: 'text-blue-500' },
  doubao: { name: '豆包', setupUrl: 'https://www.volcengine.com/product/doubao', icon: Languages, color: 'text-purple-500' },
  openai: { name: 'OpenAI', setupUrl: 'https://platform.openai.com/', icon: Layout, color: 'text-emerald-500' },
  gemini: { name: 'Gemini', setupUrl: 'https://aistudio.google.com/', icon: Sparkles, color: 'text-indigo-500' },
};

const THEMES: Record<Theme, string> = {
  modern: 'prose-modern',
  classic: 'prose-classic',
  minimal: 'prose-minimal',
  pdf: 'prose-pdf',
  'ai-custom': 'prose-ai-custom',
};

const FONT_FAMILIES = [
  { name: '系统默认', value: 'system-ui, sans-serif' },
  { name: '思源宋体 (Serif)', value: '"Source Han Serif CN", "Noto Serif SC", serif' },
  { name: '思源黑体 (Sans)', value: '"Source Han Sans SC", "Noto Sans SC", sans-serif' },
  { name: '霞鹜文楷 (Kaiti)', value: '"LXGW WenKai", STKaiti, serif' },
  { name: '等宽 (Mono)', value: '"JetBrains Mono", monospace' },
];

export default function App() {
  const [markdown, setMarkdown] = useState(() => {
    try {
      const saved = localStorage.getItem('resume-markdown');
      return saved || DEFAULT_MARKDOWN;
    } catch (e) {
      console.warn('LocalStorage access failed:', e);
      return DEFAULT_MARKDOWN;
    }
  });

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activePanel, setActivePanel] = useState<SidebarPanel | null>('content');
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('resume-theme') as Theme) || 'pdf';
    } catch (e) {
      return 'pdf';
    }
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showAIProviders, setShowAIProviders] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>('doubao');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });
  const [showFloatingBar, setShowFloatingBar] = useState(() => {
    try {
      const saved = localStorage.getItem('resume-show-floating-bar');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      console.warn('Failed to parse showFloatingBar from localStorage:', e);
      return true;
    }
  });
  const [defaultThemeOverrides, setDefaultThemeOverrides] = useState<Record<string, Partial<CustomThemeConfig>>>(() => {
    try {
      const saved = localStorage.getItem('resume-default-overrides');
      return saved ? JSON.parse(saved) : {
        pdf: { layout: 'standard' },
        modern: { layout: 'standard' },
        classic: { layout: 'standard' },
        minimal: { layout: 'standard' }
      };
    } catch (e) {
      console.warn('Failed to parse defaultThemeOverrides from localStorage:', e);
      return {
        pdf: { layout: 'standard' },
        modern: { layout: 'standard' },
        classic: { layout: 'standard' },
        minimal: { layout: 'standard' }
      };
    }
  });
  const [aiConfigs, setAiConfigs] = useState<Record<AIProvider, AIConfig>>(() => {
    try {
      const saved = localStorage.getItem('resume-ai-configs');
      return saved ? JSON.parse(saved) : {
        deepseek: { apiKey: '', modelId: '' },
        doubao: { apiKey: '', modelId: '' },
        openai: { apiKey: '', modelId: '' },
        gemini: { apiKey: '', modelId: '' },
      };
    } catch (e) {
      console.warn('Failed to parse aiConfigs from localStorage:', e);
      return {
        deepseek: { apiKey: '', modelId: '' },
        doubao: { apiKey: '', modelId: '' },
        openai: { apiKey: '', modelId: '' },
        gemini: { apiKey: '', modelId: '' },
      };
    }
  });
  const [currentAIConfig, setCurrentAIConfig] = useState<CustomThemeConfig | null>(null);
  const [savedThemes, setSavedThemes] = useState<CustomThemeConfig[]>(() => {
    try {
      const saved = localStorage.getItem('resume-saved-themes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to parse savedThemes from localStorage:', e);
      return [];
    }
  });

  const previewEditRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const turndownService = useMemo(() => {
    try {
      const Constructor = (TurndownService as any).default || TurndownService;
      let service: any;
      
      if (typeof Constructor === 'function') {
        service = new Constructor({
          headingStyle: 'atx',
          bulletListMarker: '-',
          hr: '---'
        });
      } else if (Constructor && typeof (Constructor as any).TurndownService === 'function') {
        service = new (Constructor as any).TurndownService({
          headingStyle: 'atx',
          bulletListMarker: '-',
          hr: '---'
        });
      } else {
        throw new Error('Constructor not found');
      }
      
      service.addRule('resumeAvatar', {
        filter: 'img',
        replacement: (_content: string, node: any) => {
          const src = node.getAttribute('src');
          const alt = node.getAttribute('alt') || '头像';
          const style = node.getAttribute('style') || '';
          return `<img src="${src}" alt="${alt}" ${style ? `style="${style}"` : ''} />`;
        }
      });
      
      service.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);
      service.remove('button');
      
      return service;
    } catch (e) {
      console.error('Turndown init failed:', e);
      return {
        turndown: (html: string) => html,
        addRule: () => {},
        keep: () => {},
        remove: () => {}
      };
    }
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000);
  }, []);

  const saveToHistory = useCallback((content: string) => {
    if (content === history[historyIndex]) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const deleteSelectedImage = useCallback(() => {
    if (!selectedImageId) return;
    
    const previewEl = previewEditRef.current;
    if (!previewEl) {
      console.warn('Preview ref not found during deletion');
      return;
    }
    
    try {
      // 1. Find all images in the actual DOM to determine which one matches selectedImageId
      const visibleImgs = Array.from(previewEl.querySelectorAll('img'));
      const foundVisibleImg = visibleImgs.find(img => 
        img.getAttribute('src') === selectedImageId || img.src === selectedImageId
      );
      
      if (!foundVisibleImg) {
        console.log('Selected image not found in DOM', selectedImageId);
        // Maybe it was already deleted or IDs changed?
        setSelectedImageId(null);
        return;
      }
      
      // 2. Clone the container to manipulate safely
      const clone = previewEl.cloneNode(true) as HTMLElement;
      const cloneImgs = Array.from(clone.querySelectorAll('img'));
      
      // 3. Find same index in clone
      const visibleIndex = visibleImgs.indexOf(foundVisibleImg);
      const imgToRemove = cloneImgs[visibleIndex];
      
      if (imgToRemove) {
        // Try to remove the wrapper span if it exists (ReactMarkdown often wraps them)
        const wrapper = imgToRemove.closest('.group\\/img-wrapper') || imgToRemove.parentElement;
        if (wrapper && (wrapper.classList.contains('group/img-wrapper') || wrapper.tagName === 'SPAN')) {
          wrapper.remove();
        } else {
          imgToRemove.remove();
        }
        
        // 4. Convert back to Markdown using the modified clone
        const html = clone.innerHTML;
        const md = turndownService.turndown(html);
        const cleanedMd = typeof md === 'string' ? md.replace(/\n\n\n/g, '\n\n').trim() : markdown;
        
        setMarkdown(cleanedMd);
        saveToHistory(cleanedMd);
        setSelectedImageId(null);
        showToast('图片已删除', 'success');
      } else {
        // Fallback: search by attribute in clone
        let removedCount = 0;
        cloneImgs.forEach(img => {
          if (img.getAttribute('src') === selectedImageId || img.src === selectedImageId) {
            const wrapper = img.closest('.group\\/img-wrapper') || img.parentElement;
            if (wrapper && (wrapper.classList.contains('group/img-wrapper') || wrapper.tagName === 'SPAN')) {
              wrapper.remove();
            } else {
              img.remove();
            }
            removedCount++;
          }
        });
        
        if (removedCount > 0) {
          const md = turndownService.turndown(clone.innerHTML);
          const cleanedMd = typeof md === 'string' ? md.replace(/\n\n\n/g, '\n\n').trim() : markdown;
          setMarkdown(cleanedMd);
          saveToHistory(cleanedMd);
          setSelectedImageId(null);
          showToast('图片以属性匹配方式删除', 'success');
        } else {
          showToast('无法定位选中图片', 'error');
        }
      }
    } catch (err) {
      console.error('Critical error in image deletion:', err);
      showToast('删除失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  }, [selectedImageId, turndownService, saveToHistory, showToast, markdown]);

  // Add keyboard listener for deleting selected image
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImageId && activeTab === 'preview') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        
        // If an image is explicitly selected, prioritize deleting it
        if (!isInput) {
          e.preventDefault();
          deleteSelectedImage();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to intercept before contentEditable
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedImageId, activeTab, deleteSelectedImage]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setMarkdown(prev);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setMarkdown(next);
      setHistoryIndex(historyIndex + 1);
    }
  };

  useEffect(() => {
    if (history.length === 0) {
      setHistory([markdown]);
      setHistoryIndex(0);
    }
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsSaving(true);
    try {
      localStorage.setItem('resume-markdown', markdown);
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
    const timer = setTimeout(() => setIsSaving(false), 800);
    return () => clearTimeout(timer);
  }, [markdown]);

  useEffect(() => {
    try {
      localStorage.setItem('resume-theme', theme);
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('resume-ai-configs', JSON.stringify(aiConfigs));
    } catch (e) {}
  }, [aiConfigs]);

  useEffect(() => {
    try {
      localStorage.setItem('resume-show-floating-bar', JSON.stringify(showFloatingBar));
    } catch (e) {}
  }, [showFloatingBar]);

  useEffect(() => {
    try {
      localStorage.setItem('resume-default-overrides', JSON.stringify(defaultThemeOverrides));
    } catch (e) {}
  }, [defaultThemeOverrides]);

  useEffect(() => {
    try {
      localStorage.setItem('resume-saved-themes', JSON.stringify(savedThemes));
    } catch (e) {}
  }, [savedThemes]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const config = await analyzeResumeTemplate(base64, {
          ...aiConfigs[aiProvider],
          provider: aiProvider
        });
        setCurrentAIConfig(config);
        setTheme('ai-custom');
        setActivePanel('content');
        showToast('模版识别完成，样式已应用', 'success');
      } catch (error) {
        console.error(error);
        showToast(error instanceof Error ? `识别失败: ${error.message}` : '识别失败', 'error');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const handlePolish = async () => {
    if (isPolishing) return;
    setIsPolishing(true);
    try {
      const polished = await polishResumeContent(markdown, {
        ...aiConfigs[aiProvider],
        provider: aiProvider
      });
      saveToHistory(markdown);
      setMarkdown(polished);
      saveToHistory(polished);
      showToast('AI 润色成功', 'success');
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? `润色失败: ${error.message}` : '润色失败，请稍后重试', 'error');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleClearCache = () => {
    if (confirm('确定要清除所有缓存并恢复默认内容吗？')) {
      localStorage.clear();
      setHistory([DEFAULT_MARKDOWN]);
      setHistoryIndex(0);
      window.location.reload();
    }
  };

  const handleSaveTheme = () => {
    if (!currentAIConfig) return;
    const name = prompt('请输入新模版名称', '我的定制模版');
    if (!name) return;

    const newTheme: CustomThemeConfig = {
      ...currentAIConfig,
      id: `custom-${Date.now()}`,
      name: name
    };

    setSavedThemes([...savedThemes, newTheme]);
    setCurrentAIConfig(null);
    setTheme(newTheme.id as any);
    showToast('自定义模版已保存', 'success');
  };

  const handleDeleteTheme = (id: string) => {
    if (confirm('确定要删除这个模版吗？')) {
      const filtered = savedThemes.filter(t => t.id !== id);
      setSavedThemes(filtered);
      if (theme === id) setTheme('pdf');
      showToast('模版已删除', 'info');
    }
  };

  const updateCurrentThemeConfig = (updates: Partial<CustomThemeConfig>) => {
    if (theme === 'ai-custom' && currentAIConfig) {
      setCurrentAIConfig({ ...currentAIConfig, ...updates });
    } else {
      const savedIndex = savedThemes.findIndex(t => t.id === theme);
      if (savedIndex > -1) {
        const updatedThemes = [...savedThemes];
        updatedThemes[savedIndex] = { ...updatedThemes[savedIndex], ...updates };
        setSavedThemes(updatedThemes);
      } else if (defaultThemeOverrides[theme]) {
        setDefaultThemeOverrides({
          ...defaultThemeOverrides,
          [theme]: { ...defaultThemeOverrides[theme], ...updates }
        });
      }
    }
  };

  const getActiveConfig = () => {
    return theme === 'ai-custom' 
      ? currentAIConfig 
      : (savedThemes.find(t => t.id === theme) || defaultThemeOverrides[theme]);
  };

  const getActiveThemeStyle = () => {
    const activeConfig = getActiveConfig();
    
    if (activeConfig) {
      return {
        '--cv-primary': activeConfig.primaryColor,
        '--cv-secondary': activeConfig.secondaryColor || activeConfig.primaryColor,
        '--cv-heading': activeConfig.headingColor,
        '--cv-text': activeConfig.textColor,
        '--cv-bg': activeConfig.backgroundColor,
        '--cv-font': activeConfig.fontFamily || 'system-ui',
        '--cv-line-height': activeConfig.lineHeight || 1.6,
        '--cv-font-size': activeConfig.fontSize || '14px',
        backgroundColor: activeConfig.backgroundColor,
      } as React.CSSProperties;
    }
    return { backgroundColor: '#fff' };
  };

  const getLayoutClass = () => {
    const activeConfig = getActiveConfig();
    const layout = activeConfig?.layout || 'standard';
    switch (layout) {
      case 'modern-sidebar': return 'layout-sidebar';
      case 'centered': return 'layout-centered';
      default: return 'layout-standard';
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (activeTab === 'preview') {
      setActiveTab('editor');
    }
    
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selection = markdown.substring(start, end);
      const before = markdown.substring(0, start);
      const after = markdown.substring(end);
      const newContent = `${before}${prefix}${selection}${suffix}${after}`;
      setMarkdown(newContent);
      saveToHistory(newContent);
      
      // Reset focus
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    }, activeTab === 'preview' ? 100 : 0);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#334155] font-sans overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.message && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 z-[60] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border pointer-events-none"
            style={{ 
              backgroundColor: toast.type === 'error' ? '#FEE2E2' : toast.type === 'success' ? '#ECFDF5' : '#EFF6FF',
              color: toast.type === 'error' ? '#991B1B' : toast.type === 'success' ? '#065F46' : '#1E40AF',
              borderColor: toast.type === 'error' ? '#FECACA' : toast.type === 'success' ? '#A7F3D0' : '#DBEAFE'
            }}
          >
            {toast.type === 'success' && <CheckCircle2 size={18} />}
            {toast.type === 'error' && <ShieldAlert size={18} />}
            {toast.type === 'info' && <Sparkles size={18} />}
            <span className="text-sm font-bold tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Global Navigation */}
      <aside className="w-16 sm:w-20 bg-slate-900 flex flex-col items-center py-8 gap-10 z-30 shadow-2xl shrink-0">
        <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/5 transform transition-transform hover:scale-105 active:scale-95 group cursor-pointer">
           <FileText className="text-slate-900 group-hover:scale-110 transition-transform" size={24} />
        </div>
        
        <nav className="flex flex-col gap-6">
          {[
            { icon: Edit3, label: '编辑', id: 'content', tab: 'editor' },
            { icon: LayoutTemplate, label: '模板', id: 'template', tab: 'preview' },
            { icon: Sparkles, label: '助手', id: 'ai', tab: 'preview' },
          ].map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.1 }}
            >
              <SidebarIconButton 
                icon={item.icon} 
                label={item.label} 
                active={activePanel === item.id} 
                onClick={() => { 
                  if (activePanel === item.id) {
                    setActivePanel(null);
                  } else {
                    setActivePanel(item.id as SidebarPanel); 
                    if (item.tab) setActiveTab(item.tab as any); 
                    setShowAIProviders(false); 
                  }
                }} 
              />
            </motion.div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-6 pb-2">
          <SidebarIconButton 
            icon={Settings2} 
            label="设置" 
            active={activePanel === 'settings'} 
            onClick={() => { 
              if (activePanel === 'settings') {
                setActivePanel(null);
              } else {
                setActivePanel('settings'); 
                setActiveTab('editor'); 
                setShowAIProviders(false); 
              }
            }} 
          />
        </div>
      </aside>

      {/* Second Sidebar - Panel Details */}
      <AnimatePresence>
        {activePanel && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white border-r border-slate-200/60 z-20 flex flex-col shadow-sm overflow-hidden shrink-0"
          >
        <div className="p-6 border-b border-slate-100 flex flex-col gap-1">
          <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">
            {activePanel === 'content' && '内容编辑'}
            {activePanel === 'template' && '模板库'}
            {activePanel === 'ai' && 'AI 助手'}
            {activePanel === 'settings' && '设置'}
          </h2>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
            {activePanel === 'content' && 'Resume Content & Structure'}
            {activePanel === 'template' && 'Select your visual style'}
            {activePanel === 'ai' && 'Intelligent Enhancements'}
            {activePanel === 'settings' && 'Global Preferences'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
          {activePanel === 'content' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">使用工具快速插入常用的简历区块。</p>
              <div className="grid grid-cols-4 gap-2">
                <ToolboxButton icon={Heading1} label="主标题" onClick={() => insertMarkdown('\n# ')} />
                <ToolboxButton icon={Heading2} label="二级标题" onClick={() => insertMarkdown('\n## ')} />
                <ToolboxButton icon={Bold} label="加粗" onClick={() => insertMarkdown('**', '**')} />
                <ToolboxButton icon={List} label="列表" onClick={() => insertMarkdown('\n- ')} />
                <ToolboxButton icon={Italic} label="斜体" onClick={() => insertMarkdown('*', '*')} />
                <ToolboxButton icon={LinkIcon} label="链接" onClick={() => insertMarkdown('[文字](链接)')} />
                <ToolboxButton icon={Plus} label="分隔线" onClick={() => insertMarkdown('\n---\n')} />
              </div>

              {/* Style tweaks integrated into Content panel */}
              <div className="pt-6 border-t border-gray-100 space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">色彩 & 视觉</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1">主题主色</p>
                      <input 
                        type="color" 
                        value={getActiveConfig()?.primaryColor || '#3B82F6'}
                        onChange={(e) => updateCurrentThemeConfig({ primaryColor: e.target.value })}
                        className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1">标题文字</p>
                      <input 
                        type="color" 
                        value={getActiveConfig()?.headingColor || '#1F2937'}
                        onChange={(e) => updateCurrentThemeConfig({ headingColor: e.target.value })}
                        className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">文字排版</label>
                  <div className="space-y-3">
                    <select 
                      value={getActiveConfig()?.fontFamily || 'system-ui, sans-serif'}
                      onChange={(e) => updateCurrentThemeConfig({ fontFamily: e.target.value })}
                      className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-100 outline-none"
                    >
                      {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <select 
                        value={getActiveConfig()?.fontSize || '14px'}
                        onChange={(e) => updateCurrentThemeConfig({ fontSize: e.target.value })}
                        className="text-sm border border-gray-200 rounded-lg p-2"
                      >
                        <option value="12px">字号: 12px</option>
                        <option value="14px">字号: 14px</option>
                        <option value="16px">字号: 16px</option>
                      </select>
                      <select 
                        value={getActiveConfig()?.lineHeight || 1.6}
                        onChange={(e) => updateCurrentThemeConfig({ lineHeight: Number(e.target.value) })}
                        className="text-sm border border-gray-200 rounded-lg p-2"
                      >
                        <option value="1.4">行高: 1.4</option>
                        <option value="1.6">行高: 1.6</option>
                        <option value="1.8">行高: 1.8</option>
                      </select>
                    </div>

                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">内容结构</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'standard', icon: LayoutTemplate, label: '标准' },
                      { id: 'modern-sidebar', icon: Columns, label: '侧栏' },
                      { id: 'centered', icon: Maximize2, label: '居中' }
                    ].map((l) => (
                      <motion.button
                        key={l.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          updateCurrentThemeConfig({ layout: l.id as any });
                        }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[11px] transition-all cursor-pointer ${
                          (getActiveConfig()?.layout || 'standard') === l.id
                          ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm'
                          : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <l.icon size={16} />
                        {l.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {currentAIConfig && theme === 'ai-custom' && (
                  <button 
                    onClick={handleSaveTheme}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
                  >
                    <Save size={18} />
                    保存当前样式配置
                  </button>
                )}

              {/* Move history panel from bottom of immersive editor to here */}
              <div className="pt-8 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History Log</span>
                  </div>
                  <div className="flex gap-2 bg-white border border-slate-100 p-1 rounded-lg">
                    <button 
                      onClick={handleUndo} 
                      disabled={historyIndex <= 0} 
                      className="p-1.5 hover:bg-slate-50 text-slate-600 rounded disabled:opacity-20 transition-colors"
                      title="撤销"
                    >
                      <Undo2 size={14} />
                    </button>
                    <button 
                      onClick={handleRedo} 
                      disabled={historyIndex >= history.length - 1} 
                      className="p-1.5 hover:bg-slate-50 text-slate-600 rounded disabled:opacity-20 transition-colors"
                      title="重做"
                    >
                      <Redo2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                  {history.map((h, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setMarkdown(h);
                        setHistoryIndex(i);
                      }}
                      className={`shrink-0 flex flex-col gap-0.5 p-3 rounded-xl border transition-all text-left min-w-[120px] ${
                        i === historyIndex 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-slate-300 text-slate-500'
                      }`}
                    >
                        <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">v{i + 1}</span>
                        <span className="text-[10px] font-medium truncate max-w-[100px]">
                           {h.split('\n')[0].replace(/[#*]/g, '').trim() || 'Untitled'}
                        </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activePanel === 'template' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <TemplateCard 
                  id="pdf" 
                  name="蓝灰商务" 
                  active={theme === 'pdf'} 
                  onClick={() => setTheme('pdf')} 
                  preview="https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=300&q=80"
                />
                <TemplateCard 
                  id="modern" 
                  name="现代极简" 
                  active={theme === 'modern'} 
                  onClick={() => setTheme('modern')} 
                  preview="https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=300&q=80"
                />
                <TemplateCard 
                  id="classic" 
                  name="经典稳重" 
                  active={theme === 'classic'} 
                  onClick={() => setTheme('classic')} 
                  preview="https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=300&q=80"
                />
              </div>

              {/* Add/Remove Template buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={triggerUpload}
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all font-sans text-sm font-bold"
                >
                  <Plus size={18} />
                  识别新模版
                </button>
                <button 
                  onClick={() => {
                    const custom = savedThemes.find(t => t.id === theme);
                    if (custom) handleDeleteTheme(custom.id!);
                    else alert('系统内置模版不可删除');
                  }}
                  className="w-12 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                >
                  <Minus size={18} />
                </button>
              </div>

              {savedThemes.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">我的收藏</h3>
                  <div className="space-y-3">
                    {savedThemes.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 cursor-pointer group" onClick={() => setTheme(t.id as any)}>
                        <span className={`text-sm ${theme === t.id ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>{t.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTheme(t.id!); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activePanel === 'ai' && (
            <div className="space-y-6">
              <section className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">服务商配置</label>
                <button 
                  onClick={() => setShowAIProviders(!showAIProviders)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    showAIProviders 
                      ? 'bg-slate-800 border-slate-800 text-white shadow-lg shadow-slate-200' 
                      : 'bg-white border-gray-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings2 size={16} />
                    <span className="text-sm font-medium">AI 服务商设置</span>
                  </div>
                  <ChevronRight size={14} className={showAIProviders ? 'rotate-90 transition-transform' : ''} />
                </button>
              </section>

              {!showAIProviders ? (
                <>
                  <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-purple-700 font-bold">
                      <Sparkles size={20} />
                      <span>AI 智能润色</span>
                    </div>
                    <p className="text-xs text-purple-600 leading-relaxed">
                      模型会自动优化措辞、纠正语法，并使简历更具职场专业厚度。
                    </p>
                    <button 
                      onClick={handlePolish}
                      disabled={isPolishing}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white p-2.5 rounded-xl text-sm font-bold shadow-md shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50 transition-all font-sans"
                    >
                      {isPolishing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                      一键智能润色
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl space-y-3 font-sans">
                    <div className="flex items-center gap-2 text-blue-700 font-bold">
                      <Layout size={20} />
                      <span>AI 模版克隆</span>
                    </div>
                    <p className="text-xs text-blue-600 leading-relaxed">
                      上传一份您喜欢的简历图片，AI 将自动分析风格并生成对应主题。
                    </p>
                    <button 
                      onClick={triggerUpload}
                      disabled={isAnalyzing}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white p-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      克隆他人模版
                    </button>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                     <p className="text-[10px] text-gray-400 font-medium">配置生效后，点击上方润色按钮即可使用</p>
                  </div>
                </>
              ) : (
                <div className="bg-slate-900/5 p-4 rounded-2xl border border-slate-900/10">
                   <p className="text-[11px] text-slate-500 leading-relaxed italic">
                     请在中央区域完成服务商配置。配置完成后，关闭此设置面板即可使用 AI 工具。
                   </p>
                </div>
              )}
            </div>
          )}
          {activePanel === 'settings' && (
            <div className="space-y-6">
              <section className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">数据管理</label>
                  <button 
                    onClick={handleClearCache}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-red-100 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 size={16} />
                      <span className="text-sm font-medium">重置应用缓存</span>
                    </div>
                  </button>
                  <p className="text-[10px] text-gray-400 mt-2 px-1">警告：这将会删除所有保存的项目、模版和配置。</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">隐私声明</label>
                  <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-500 leading-relaxed border border-slate-100">
                    本应用所有数据（除 AI 识别请求外）均存储在您的本地浏览器 LocalStorage 中。我们不会收集您的个人隐私数据。
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">系统交互</span>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">悬浮操作栏</span>
                      <span className="text-[10px] text-slate-400">在预览窗口底部显示快速按钮</span>
                    </div>
                    <button 
                      onClick={() => setShowFloatingBar(!showFloatingBar)}
                      className={`w-9 h-5 rounded-full transition-all duration-300 relative ${showFloatingBar ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-slate-200'}`}
                    >
                      <motion.div 
                        animate={{ x: showFloatingBar ? 18 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </motion.aside>
    )}
    </AnimatePresence>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F1F5F9] relative">
        {/* Top Header Tool Bar */}
        <header className="h-20 bg-white border-b border-slate-200/60 px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-6">
            <AnimatePresence mode="wait">
              {isSaving ? (
                <motion.div 
                  key="saving"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-full text-[10px] uppercase font-bold tracking-widest border border-slate-200"
                >
                  <Loader2 size={12} className="animate-spin" />
                  <span>Saving...</span>
                </motion.div>
              ) : (
                <motion.div 
                  key="saved"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="hidden xl:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-[10px] uppercase font-bold tracking-widest border border-emerald-100 shadow-sm"
                >
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span>Cloud Synced</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50">
              <button 
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeTab === 'editor' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Edit3 size={16} /> 沉浸编辑
              </button>
              <button 
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeTab === 'preview' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layout size={16} /> 视觉预览
              </button>
            </div>

            <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

            <button 
              onClick={handlePrint}
              className="group flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-slate-900/10 active:scale-95"
            >
              <Printer size={18} className="group-hover:rotate-12 transition-transform" />
              <span>下载简历 (PDF)</span>
            </button>
          </div>
        </header>

        {/* Mobile Sidebar Toggle - Only on small screens */}
        <div className="sm:hidden flex border-b bg-white p-2 gap-2 overflow-x-auto whitespace-nowrap">
          <MobileNavButton active={activePanel === 'content'} onClick={() => setActivePanel(activePanel === 'content' ? null : 'content')}>内容</MobileNavButton>
          <MobileNavButton active={activePanel === 'template'} onClick={() => setActivePanel(activePanel === 'template' ? null : 'template')}>模板</MobileNavButton>
          <MobileNavButton active={activePanel === 'ai'} onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}>AI</MobileNavButton>
          <MobileNavButton active={activePanel === 'settings'} onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}>设置</MobileNavButton>
        </div>

        {/* Workspace Panels */}
        <div className="flex-1 overflow-hidden flex relative">
          {activePanel === 'ai' && showAIProviders ? (
            <div className="flex-1 bg-white flex flex-col sm:flex-row overflow-hidden">
               {/* Content List */}
               <div className="w-full sm:w-96 border-r border-[#F1F5F9] p-8 space-y-6 shrink-0 overflow-y-auto bg-slate-50/50">
                 <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">AI 模型集成</h3>
                    <p className="text-xs text-slate-500 font-medium">配置您的专属 AI 能力提供商</p>
                 </div>

                 <div className="space-y-3">
                   {Object.entries(PROVIDER_INFO).map(([id, info]) => {
                     const config = aiConfigs[id as AIProvider];
                     const isConfigured = config.apiKey.length > 0;
                     return (
                       <button
                         key={id}
                         onClick={() => setAiProvider(id as AIProvider)}
                         className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 group ${
                           aiProvider === id 
                             ? 'border-slate-900 bg-white shadow-xl shadow-slate-200/50 scale-[1.02]' 
                             : 'border-transparent hover:border-slate-200 bg-white/40 hover:bg-white'
                         }`}
                       >
                         <div className="flex items-center gap-4">
                           <div className={`p-3 rounded-xl bg-slate-50 shadow-sm border border-slate-100 transition-transform duration-300 group-hover:scale-110 ${info.color}`}>
                             <info.icon size={24} />
                           </div>
                           <div className="text-left font-sans">
                             <p className="text-sm font-bold text-slate-800">{info.name}</p>
                             <p className={`text-[10px] uppercase font-black tracking-widest mt-0.5 ${isConfigured ? 'text-emerald-500' : 'text-slate-400'}`}>
                               {isConfigured ? 'READY' : 'UNCONFIGURED'}
                             </p>
                           </div>
                         </div>
                         {aiProvider === id && (
                           <div className="w-2 h-2 bg-slate-900 rounded-full" />
                         )}
                       </button>
                     );
                   })}
                 </div>

                 <div className="pt-6 border-t border-slate-200/60 font-sans">
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
                       <ShieldAlert className="text-amber-600 shrink-0" size={18} />
                       <div className="space-y-1">
                          <p className="text-xs font-bold text-amber-900">数据安全提示</p>
                          <p className="text-[10px] text-amber-700 leading-relaxed">您的 API Key 仅存储在浏览器本地缓存中，识别请求将直接发往服务商代理。</p>
                       </div>
                    </div>
                 </div>
               </div>

               {/* Config Form */}
               <div className="flex-1 p-8 sm:p-16 space-y-12 overflow-y-auto bg-white custom-scrollbar">
                 <div className="max-w-xl mx-auto sm:mx-0">
                    <motion.div 
                      key={aiProvider}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-12 space-y-4"
                    >
                       <div className="flex items-center gap-5">
                          <div className={`p-5 rounded-[2rem] bg-slate-50 border border-slate-100 shadow-sm ${PROVIDER_INFO[aiProvider].color}`}>
                             {React.createElement(PROVIDER_INFO[aiProvider].icon, { size: 48 })}
                          </div>
                          <div>
                            <h2 className="text-5xl font-black text-slate-900 tracking-tighter">{PROVIDER_INFO[aiProvider].name}</h2>
                            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mt-1">Provider Configuration</p>
                          </div>
                       </div>
                    </motion.div>

                    <div className="space-y-10">
                       <div className="space-y-4">
                          <label className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase block">API Authentication Key</label>
                          <div className="relative group">
                            <input 
                              type="password"
                              value={aiConfigs[aiProvider].apiKey}
                              onChange={(e) => setAiConfigs({...aiConfigs, [aiProvider]: {...aiConfigs[aiProvider], apiKey: e.target.value}})}
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-[1.25rem] p-5 text-lg font-mono focus:ring-8 focus:ring-slate-100 focus:bg-white focus:border-slate-400 outline-none transition-all shadow-sm group-hover:border-slate-300"
                              placeholder="在此输入您的 API 密钥"
                            />
                            <Key className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={20} />
                          </div>
                       </div>
                       <div className="space-y-4">
                          <label className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase block">Assigned Model Identifier</label>
                          <div className="relative group font-sans">
                            <input 
                              type="text"
                              value={aiConfigs[aiProvider].modelId}
                              onChange={(e) => setAiConfigs({...aiConfigs, [aiProvider]: {...aiConfigs[aiProvider], modelId: e.target.value}})}
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-[1.25rem] p-5 text-lg font-mono focus:ring-8 focus:ring-slate-100 focus:bg-white focus:border-slate-400 outline-none transition-all shadow-sm group-hover:border-slate-300"
                              placeholder={aiProvider === 'doubao' ? 'ep-2024...' : 'gpt-4o / gemini-1.5-pro'}
                            />
                            <Terminal className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={20} />
                          </div>
                       </div>
                    </div>

                    <div className="mt-20 pt-10 border-t border-slate-100">
                       <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 font-sans">
                          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                             <ShieldCheck className="text-blue-400" size={20} />
                             Security Protocol
                          </h4>
                          <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-medium">
                            <p className="flex gap-2">
                              <span className="text-blue-400 font-bold tracking-widest text-[9px] mt-0.5">01</span>
                              <span>所有 AI 能力（智能润色、模版克隆）将基于此处选择的模型架构运行。</span>
                            </p>
                            <p className="flex gap-2">
                              <span className="text-blue-400 font-bold tracking-widest text-[9px] mt-0.5">02</span>
                              <span>密钥完全加密存储在浏览器本地 LocalStorage 中，不会上传服务器。</span>
                            </p>
                            <p className="flex gap-2">
                              <span className="text-blue-400 font-bold tracking-widest text-[9px] mt-0.5">03</span>
                              <span>建议使用具备 Vision 能力的模型以支持模版识图功能。</span>
                            </p>
                          </div>
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          ) : (
            <>
              {/* Editor - Only visible in Editor mode */}
              {activeTab === 'editor' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-1 h-full flex flex-col bg-white overflow-hidden border-r border-[#F1F5F9]"
                >
                   <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-sm shrink-0">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Markdown Workspace</span>
                      <div className="flex gap-4">
                        <span className="text-[10px] text-gray-400 font-mono italic">Lines: {markdown.split('\n').length}</span>
                        <span className="text-[10px] text-gray-400 font-mono italic">Chars: {markdown.length}</span>
                      </div>
                   </div>
                   <textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    onBlur={() => saveToHistory(markdown)}
                    className="flex-1 w-full p-8 sm:p-12 resize-none focus:outline-none font-mono text-sm leading-relaxed text-[#334155] bg-transparent custom-scrollbar"
                    placeholder="在这里开始书写您的简历内容..."
                    spellCheck={false}
                  />
                </motion.div>
              )}

              {/* Preview */}
              <div className={`flex-1 overflow-hidden transition-all duration-300 bg-[#F1F5F9] flex flex-col`}>
                {activeTab === 'editor' && (
                  <div className="p-2 px-6 border-b border-gray-100 bg-white/30 flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold shrink-0">
                    <History size={12} />
                    预览窗口（同步渲染）
                  </div>
                )}
                <div className={`flex-1 overflow-y-auto custom-scrollbar ${activeTab === 'preview' ? 'p-6 sm:p-20' : 'p-4 sm:p-10'} pb-32 flex flex-col items-center bg-[#F1F5F9]/50`}>
                  <div className="w-full max-w-[210mm] relative">
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={theme + JSON.stringify(getActiveConfig() || '') + activePanel}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        ref={printRef}
                        className={`print-container mx-auto w-full min-h-[297mm] shadow-2xl shadow-slate-300/50 rounded-sm origin-top group relative ${
                          THEMES[theme as Theme] || 'prose-ai-custom'
                        } ${getLayoutClass()}`}
                        style={getActiveThemeStyle()}
                      >
                        <div 
                          ref={previewEditRef}
                          className={`prose-wrapper transition-all duration-300 ${activeTab === 'preview' ? 'cursor-text hover:bg-slate-50/30' : ''}`}
                          contentEditable={activeTab === 'preview'}
                          suppressContentEditableWarning
                          title={activeTab === 'preview' ? "直接在简历上点击即可修改文字" : ""}
                          onClick={(e) => {
                            if (activeTab === 'preview') {
                              const target = e.target as HTMLElement;
                              if (target.tagName !== 'IMG' && !target.closest('.group/img-wrapper')) {
                                setSelectedImageId(null);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            if (activeTab === 'preview') {
                              const html = e.currentTarget.innerHTML;
                              // Convert to markdown only on blur to avoid typing lag
                              const md = turndownService.turndown(html);
                              const cleanedMd = md.replace(/\n\n\n/g, '\n\n').trim();
                              if (cleanedMd !== markdown) {
                                setMarkdown(cleanedMd);
                                saveToHistory(cleanedMd);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            // Allow basic formatting shortcuts if needed, 
                            // but mostly prevent default behavior that might break our structure
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              document.execCommand('insertText', false, '    ');
                            }
                          }}
                        >
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkBreaks]} 
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              img: ({ node, ...props }) => {
                                const { src, alt, title, className, style } = props as any;
                                const isSelected = selectedImageId !== null && selectedImageId === src;
                                
                                return (
                                  <span className="relative inline-block group/img-wrapper leading-[0]">
                                    <motion.img 
                                      src={src || ''}
                                      alt={alt || ''}
                                      title={title || ''}
                                      onClick={(e) => {
                                        if (activeTab === 'preview') {
                                          e.stopPropagation();
                                          const newId = selectedImageId === src ? null : (src || null);
                                          console.log('Image selection toggled:', { prev: selectedImageId, next: newId });
                                          setSelectedImageId(newId);
                                        }
                                      }}
                                      className={`resume-avatar ${className || ''} ${activeTab === 'preview' ? 'cursor-move active:scale-95 transition-transform' : ''} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''} inline-block`} 
                                      style={style}
                                      drag={activeTab === 'preview'}
                                      dragMomentum={false}
                                      dragConstraints={printRef}
                                      onDragEnd={(event, info) => {
                                        if (activeTab === 'preview' && previewEditRef.current) {
                                          try {
                                            // Handle relative positioning for drag persistence
                                            const img = event.target as HTMLImageElement;
                                            const rect = img.getBoundingClientRect();
                                            const parentRect = img.parentElement?.getBoundingClientRect();
                                            if (parentRect) {
                                              // This is a naive way to persist position, but since we're using Markdown, 
                                              // it's tricky. We'll rely on HTML styles.
                                            }
                                            
                                            const md = turndownService.turndown(previewEditRef.current.innerHTML);
                                            const cleanedMd = md.replace(/\n\n\n/g, '\n\n').trim();
                                            if (cleanedMd !== markdown) {
                                              setMarkdown(cleanedMd);
                                              saveToHistory(cleanedMd);
                                            }
                                          } catch (err) {
                                            console.error('Failed to sync on drag end:', err);
                                          }
                                        }
                                      }}
                                      referrerPolicy="no-referrer" 
                                      contentEditable={false}
                                    />
                                    {isSelected && activeTab === 'preview' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSelectedImage();
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors z-50 flex items-center justify-center w-5 h-5"
                                        title="删除图片"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    )}
                                  </span>
                                );
                              }
                            }}
                          >
                            {markdown}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <AnimatePresence>
                      {showFloatingBar && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md text-white p-2.5 rounded-[2rem] shadow-2xl border border-white/10 z-[50]"
                        >
                           <button 
                             onClick={() => {
                               navigator.clipboard.writeText(markdown);
                               showToast('源码已复制到剪贴板');
                             }}
                             className="flex items-center gap-2 px-5 py-2.5 hover:bg-white/10 rounded-full text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                           >
                             <FileText size={14} />
                             Copy Source
                           </button>
                           <div className="w-[1px] h-4 bg-white/20 mx-1" />
                           <button 
                             onClick={handlePrint}
                             className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95"
                           >
                             <Printer size={14} />
                             Export PDF
                           </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        
        .layout-sidebar .prose-wrapper { display: grid; grid-template-columns: 1fr 2.2fr; gap: 40px; }
        .layout-centered .prose-wrapper { text-align: center; }
        .layout-centered h1, .layout-centered h2 { margin-left: auto !important; margin-right: auto !important; }
        
        @media print {
          .flex, aside, header, textarea, .sm\\:hidden, button, select { display: none !important; }
          #root, body { overflow: visible !important; height: auto !important; background: white !important; }
          .print-container { 
            box-shadow: none !important; 
            margin: 0 !important; 
            width: 210mm !important; 
            min-height: 297mm !important; 
            border: none !important;
            padding: 15mm 20mm !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}

// Sub-components
function SidebarIconButton({ icon: Icon, label, active, onClick, danger }: { icon: any, label: string, active?: boolean, onClick: () => void, danger?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`relative group flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-300 ${
        active 
          ? 'bg-white/10 text-white shadow-lg' 
          : danger 
            ? 'text-slate-500 hover:bg-red-500/10 hover:text-red-400' 
            : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
      }`}
    >
      <Icon size={22} className={`transition-transform duration-300 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'group-hover:scale-110'}`} />
      <span className={`text-[10px] font-bold uppercase tracking-widest transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>{label}</span>
      {active && (
        <motion.div 
          layoutId="sidebar-active" 
          className="absolute right-0 w-1 sm:w-1.5 h-8 bg-blue-400 rounded-l-full shadow-[-4px_0_12px_rgba(59,130,246,0.5)]" 
        />
      )}
    </button>
  );
}

function ToolboxButton({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm transition-all text-slate-500 hover:text-blue-600 group"
      title={label}
    >
      <Icon size={18} className="group-hover:scale-110 transition-transform" />
      <span className="text-[10px] font-semibold tracking-tight">{label}</span>
    </button>
  );
}

function TemplateCard({ id, name, preview, active, onClick }: { id: string, name: string, preview: string, active: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`relative group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
        active ? 'border-blue-500 ring-8 ring-blue-500/5 shadow-xl scale-[1.02]' : 'border-slate-100 hover:border-slate-300 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
        <img 
          src={preview} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className={`absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 bg-white/95 backdrop-blur-md flex items-center justify-between border-t border-slate-100/50">
        <span className={`text-xs font-bold tracking-tight ${active ? 'text-blue-600' : 'text-slate-600'}`}>{name}</span>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
           active ? 'bg-blue-500 text-white' : 'bg-slate-100 text-transparent'
        }`}>
           <CheckCircle2 size={12} />
        </div>
      </div>
    </div>
  );
}

function MobileNavButton({ active, children, onClick }: { active: boolean, children: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
        active ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white text-gray-500 border-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
