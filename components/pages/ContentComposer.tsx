"use client";
import { useState } from 'react';
import axios from 'axios';
import { PLATFORM_CAPABILITIES } from '../config/platforms';

export function ContentComposer() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['LinkedIn']);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activePreview, setActivePreview] = useState<string>('LinkedIn');
  const [currentContentId, setCurrentContentId] = useState<string | null>(null);

  const platforms = Object.keys(PLATFORM_CAPABILITIES);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
    if (!selectedPlatforms.includes(platform)) {
      setActivePreview(platform);
    } else if (activePreview === platform && selectedPlatforms.length > 1) {
      setActivePreview(selectedPlatforms.find(p => p !== platform) || '');
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const { createContent } = await import('@/actions/content');
      const response = await createContent({
        title,
        content,
        platforms: selectedPlatforms,
        mediaUrl: mediaUrl || undefined
      });
      if (response.success && response.data) {
        setCurrentContentId(response.data.id);
        alert('Draft saved successfully!');
      } else {
        alert(response.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Failed to save draft', error);
      alert('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform to publish to.');
      return;
    }
    setIsPublishing(true);
    try {
      const { createContent, publishContent } = await import('@/actions/content');
      
      // 1. Auto-save the latest content (including mediaUrl)
      const saveResponse = await createContent({
        title: title || 'Quick Post',
        content,
        platforms: selectedPlatforms,
        mediaUrl: mediaUrl || undefined
      });
      
      if (!saveResponse.success || !saveResponse.data) {
        throw new Error(saveResponse.error || 'Failed to auto-save draft');
      }
      
      const contentId = saveResponse.data.id;
      setCurrentContentId(contentId);

      // 2. Publish it immediately
      const response = await publishContent(contentId);
      if (response.success && response.results) {
        const resultsText = response.results.map((r: any) => `${r.platform}: ${r.success ? 'Success ✅' : 'Failed ❌ - ' + r.error}`).join('\n');
        alert(`Publishing Results:\n\n${resultsText}`);
      } else {
        alert(response.error || 'Error publishing content.');
      }
    } catch (error: any) {
      console.error('Failed to publish', error);
      alert(error.message || 'Failed to publish content');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/api/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setMediaUrl(response.data.data.url);
      }
    } catch (error) {
      console.error('File upload failed', error);
      alert('Failed to upload media');
    }
  };

  const getWarning = (platform: string, text: string) => {
    const caps = PLATFORM_CAPABILITIES[platform];
    if (caps.characterLimit && text.length > caps.characterLimit) {
      return `⚠ ${platform} content exceeds the allowed character count (${text.length}/${caps.characterLimit}).`;
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Editor Column */}
      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-medium text-gray-200 mb-6">Create Content</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Internal title (e.g. Spring Boot 4 announcement)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Platforms</label>
              <div className="flex flex-wrap gap-3">
                {platforms.map(platform => {
                  const isSelected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        isSelected 
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {isSelected && '☑ '} {platform}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Master Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Write your post here..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>
            
            {/* Image Uploader */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Media</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg transition-colors font-medium">
                  Upload Image
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
                {mediaUrl && (
                  <div className="text-sm text-green-400 flex items-center gap-2">
                    <span>✓ Media attached</span>
                    <button onClick={() => setMediaUrl(null)} className="text-gray-500 hover:text-red-400">Remove</button>
                  </div>
                )}
              </div>
            </div>

            {/* Platform Warnings */}
            <div className="space-y-2">
              {selectedPlatforms.map(platform => {
                const warning = getWarning(platform, content);
                if (!warning) return null;
                return (
                  <div key={platform} className="text-amber-500/90 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    {warning}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing}
            className="px-6 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors font-medium flex-1 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            onClick={handlePublish}
            disabled={isPublishing || selectedPlatforms.length === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex-1 disabled:opacity-50"
          >
            {isPublishing ? 'Publishing...' : 'Review & Publish'}
          </button>
        </div>
      </div>

      {/* Preview Column */}
      <div className="space-y-6">
        <div className="flex gap-2 p-1 bg-gray-900 border border-gray-800 rounded-lg overflow-x-auto">
          {selectedPlatforms.map(platform => (
            <button
              key={platform}
              onClick={() => setActivePreview(platform)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activePreview === platform
                  ? 'bg-gray-800 text-gray-100'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {platform} Preview
            </button>
          ))}
          {selectedPlatforms.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500">Select a platform to preview</div>
          )}
        </div>

        {activePreview && selectedPlatforms.includes(activePreview) && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 min-h-[400px]">
            {activePreview === 'X' ? (
              // X (Twitter) Specific Preview
              <div className="bg-black border border-gray-800 p-4 rounded-xl max-w-lg mx-auto text-white font-sans">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white">
                      GD
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-bold text-[15px] hover:underline cursor-pointer">GenzyDev</span>
                        <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-[18px] h-[18px] text-[#1d9bf0] fill-current"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.746 1.86 3.42-.326 2.115 1.258 4.025 3.393 4.025.432 0 .848-.095 1.228-.266 1.096 1.637 2.923 2.7 4.982 2.7 2.057 0 3.884-1.063 4.98-2.7.38.17.795.265 1.226.265 2.135 0 3.72-1.91 3.394-4.026 1.12-.675 1.86-1.96 1.86-3.422zm-12.72 4.41l-3.36-3.36 1.41-1.41 1.95 1.95 5.54-5.54 1.41 1.41-6.95 6.95z"></path></g></svg>
                        <span className="text-gray-500 text-[15px]">@GenzyDev</span>
                        <span className="text-gray-500 text-[15px]">·</span>
                        <span className="text-gray-500 text-[15px] hover:underline cursor-pointer">1m</span>
                      </div>
                      <div className="text-gray-500 hover:text-[#1d9bf0] cursor-pointer">
                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current"><g><path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></g></svg>
                      </div>
                    </div>
                    
                    <div className="mt-1 whitespace-pre-wrap text-[15px] leading-normal">
                      {content || <span className="text-gray-600">What is happening?!</span>}
                    </div>

                    {mediaUrl && PLATFORM_CAPABILITIES[activePreview]?.supportsImages && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-700">
                        <img src={mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[500px]" />
                      </div>
                    )}
                    
                    <div className="mt-3 flex justify-between text-gray-500 max-w-md">
                      <div className="flex items-center gap-2 hover:text-[#1d9bf0] cursor-pointer group">
                        <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 transition-colors"><svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current"><g><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></g></svg></div>
                      </div>
                      <div className="flex items-center gap-2 hover:text-[#00ba7c] cursor-pointer group">
                        <div className="p-2 rounded-full group-hover:bg-[#00ba7c]/10 transition-colors"><svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current"><g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g></svg></div>
                      </div>
                      <div className="flex items-center gap-2 hover:text-[#f91880] cursor-pointer group">
                        <div className="p-2 rounded-full group-hover:bg-[#f91880]/10 transition-colors"><svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current"><g><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></g></svg></div>
                      </div>
                      <div className="flex items-center gap-2 hover:text-[#1d9bf0] cursor-pointer group">
                        <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 transition-colors"><svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current"><g><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></g></svg></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Generic / Default Platform Preview
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white">
                    GD
                  </div>
                  <div>
                    <div className="font-semibold text-gray-200">GenzyDev</div>
                    <div className="text-xs text-gray-500">Just now • {activePreview}</div>
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-gray-300 text-sm md:text-base">
                  {content || <span className="text-gray-600 italic">Your content will appear here...</span>}
                </div>
                
                {mediaUrl && PLATFORM_CAPABILITIES[activePreview]?.supportsImages && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
                    <img src={mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[400px]" />
                  </div>
                )}
                
                <div className="mt-6 pt-4 border-t border-gray-800 flex gap-6 text-gray-500 text-sm">
                  <button className="hover:text-blue-400 transition-colors">Like</button>
                  <button className="hover:text-blue-400 transition-colors">Comment</button>
                  <button className="hover:text-blue-400 transition-colors">Share</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
