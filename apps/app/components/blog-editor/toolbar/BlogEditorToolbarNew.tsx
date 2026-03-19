// import { motion } from "framer-motion";
// import { useState, useEffect } from "React";
// import { Button } from "./button/Button";

// export function BlogEditorToolbarNew() {
//     const [keyboardOffset, setKeyboardOffset] = useState(0);

//     useEffect(() => {

//         if (typeof window === 'undefined') return;

//         const update = () => {
//             const vv = (window as any).visualViewport;
//             setKeyboardOffset(vv ? Math.max(0, window.innerHeight - vv.height) : 0);
//         };

//         update();

//         const vv = (window as any).visualViewport;
//         vv?.addEventListener?.('resize', update);
//         vv?.addEventListener?.('scroll', update);

//         window.addEventListener('resize', update);
//         window.addEventListener('orientationchange', update);
        
//         return () => {
//             vv?.removeEventListener?.('resize', update);
//             vv?.removeEventListener?.('scroll', update);
//             window.removeEventListener('resize', update);
//             window.removeEventListener('orientationchange', update);
//         };
//     }, []);

//     return (
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           exit={{ opacity: 0, y: 8 }}
//           transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
//           style={{
//             position: 'fixed',
//             left: 0,
//             right: 0,
//             zIndex: 50,
//             bottom: `calc(${keyboardOffset}px + env(safe-area-inset-bottom))`,
//             transition: 'bottom 160ms ease',
//           }}
//           className="flex justify-center px-4 pb-4 pt-2"
//         >
//             <div id="main-editor-toolbar" className="flex items-center gap-0.5 px-2 py-[5px] rounded-full border border-border/50 bg-background shadow-xl shadow-black/12">
//                 <HistoryMenu
//                     versions={versions}
//                     onFetchVersions={onFetchVersions}
//                     onVersionRevert={onVersionRevert}
//                     currentVersionId={currentVersionId}
//                 />
//                 <Button
//                     icon={<FilePlus2 size={16} />}
//                     title="New draft version"
//                     onClick={() => setNewDraftOpen(true)}
//                     disabled={!onNewDraft}
//                 />
//                 <Divider />
//                 <TagsMenu tags={tags} onSaveTags={onSaveTags} />
//                 <Divider />
//                 <DateMenu publishedDate={publishedDate} onSavePublishedDate={onSavePublishedDate} />
//                 <Divider />
//                 <ExcerptMenu
//                     excerpt={excerpt}
//                     autoExcerpt={autoExcerpt}
//                     onSaveExcerpt={onSaveExcerpt}
//                 />
//                 <Divider />
//                 <UrlMenu
//                     blogName={blogName}
//                     previewSlug={previewSlug}
//                     onCheckSlugAvailable={onCheckSlugAvailable}
//                     onRenameBlogName={onRenameBlogName}
//                 />
//                 <Divider />
//                 <SettingsMenu settings={settings} onSettingChange={onSettingChange} />
//                 <Divider />
//                 <Button
//                     icon={<Trash2 size={18} />}
//                     title={onDeleteBlog ? 'Delete blog' : 'Save the blog first to delete it'}
//                     onClick={onDeleteBlog}
//                     disabled={!onDeleteBlog}
//                 />
//             </div>
//         </motion.div>
//     )
// }