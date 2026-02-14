import * as React from "react";
import { createRoot } from "react-dom/client";
import { App, Modal, Notice, TFile } from "obsidian";

import type { IFlowershowSettings } from "../settings";
import type { PublishStatus } from "../Publisher";
import Publisher from "../Publisher";
import { API_URL } from "../settings";

import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import {
	TreeItemDragAndDropOverlay,
	TreeViewBaseItem,
	UseTreeItemParameters,
} from "@mui/x-tree-view";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { useTreeItem } from "@mui/x-tree-view/useTreeItem";
import { TreeItemProvider } from "@mui/x-tree-view/TreeItemProvider";
import { TreeItemIcon } from "@mui/x-tree-view/TreeItemIcon";
import {
	TreeItemIconContainer,
	TreeItemCheckbox,
	TreeItemLabel,
	TreeItemRoot,
	TreeItemContent,
	TreeItemGroupTransition,
} from "@mui/x-tree-view/TreeItem";
import { Box } from "@mui/material";
import { FlowershowError } from "src/utils";

interface PublishStatusModalProps {
	app: App;
	publisher: Publisher;
	settings: IFlowershowSettings;
}

type NodeType = "file" | "folder";

type ExtendedTreeItemProps = {
	nodeType?: NodeType;
	id: string;
	label: string;
};

function buildFileTree(
	items: Array<TFile | string>
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
	const nodeMap = new Map<string, TreeViewBaseItem<ExtendedTreeItemProps>>();

	items.forEach((item) => {
		const path = item instanceof TFile ? item.path : item;
		const parts = path.split("/");

		parts.forEach((part, i) => {
			const currentPath = parts.slice(0, i + 1).join("/");
			const parentPath = parts.slice(0, i).join("/");
			const isLastPart = i === parts.length - 1;

			if (!nodeMap.has(currentPath)) {
				nodeMap.set(currentPath, {
					id: currentPath,
					label: part,
					children: [],
					nodeType: isLastPart ? "file" : "folder", // ✅ set nodeType
				});
			}

			const currentNode = nodeMap.get(currentPath)!;

			if (i > 0) {
				const parentNode = nodeMap.get(parentPath);
				if (parentNode) {
					if (!parentNode.children) parentNode.children = [];
					if (!parentNode.children.some((child) => child.id === currentPath)) {
						parentNode.children.push(currentNode);
					}
				}
			}
		});
	});

	const rootNodes = Array.from(nodeMap.values()).filter(
		(node) => !node.id.includes("/")
	);

	const sortNodes = (
		nodes: TreeViewBaseItem<ExtendedTreeItemProps>[]
	): TreeViewBaseItem<ExtendedTreeItemProps>[] =>
		nodes
			.sort((a, b) => a.label.localeCompare(b.label))
			.map((node) => ({
				...node,
				children:
					node.children && node.children.length > 0
						? sortNodes(
								node.children as TreeViewBaseItem<ExtendedTreeItemProps>[]
						  )
						: undefined,
			}));

	return sortNodes(rootNodes);
}

interface SectionProps {
	title: string;
	count: number;
	items: Array<TFile | string>;
	buttonText?: string;
	loading?: boolean;
	disabled?: boolean;
	onButtonClick?: () => Promise<void>;
	selectedItems?: string[];
	onSelectionChange?: (ids: (string | number)[]) => void;
	defaultCollapsed?: boolean;
}

const Section: React.FC<SectionProps> = ({
	title,
	count,
	items,
	buttonText,
	loading = false,
	disabled = false,
	onButtonClick,
	selectedItems = [],
	onSelectionChange,
	defaultCollapsed = false,
}) => {
	const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
	const fileTree = React.useMemo(() => buildFileTree(items), [items]);

	// Collect a set of *file* IDs so we can filter selections
	const fileIdSet = React.useMemo(() => {
		const set = new Set<string>();
		const visit = (nodes: TreeViewBaseItem<ExtendedTreeItemProps>[]) => {
			for (const n of nodes) {
				if (
					(n as TreeViewBaseItem<ExtendedTreeItemProps>).nodeType === "file"
				) {
					set.add(String(n.id));
				}
				if (n.children && n.children.length) {
					visit(n.children as TreeViewBaseItem<ExtendedTreeItemProps>[]);
				}
			}
		};
		visit(fileTree);
		return set;
	}, [fileTree]);

	// Ensure the controlled selectedItems are files-only
	const selectedFileItems = React.useMemo(
		() => (selectedItems || []).filter((id) => fileIdSet.has(String(id))),
		[selectedItems, fileIdSet]
	);

	return (
		<div className="header-container" style={{ marginBottom: "8px" }}>
			<div
				className="title-container"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					cursor: "pointer",
				}}
				onClick={() => setIsCollapsed(!isCollapsed)}
			>
				<h3
					style={{
						fontSize: "1em",
						margin: 0,
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span style={{ fontSize: "0.8em" }}>{isCollapsed ? "▶" : "▼"}</span>
					{title}
					<span className="count">({count} files)</span>
				</h3>
				{buttonText && onButtonClick && (
					<button
						style={{ cursor: loading ? "default" : "pointer" }}
						onClick={async (e) => {
							e.stopPropagation();
							const button = e.currentTarget as HTMLButtonElement;
							button.disabled = true;
							await onButtonClick();
							button.disabled = false;
						}}
						disabled={loading || selectedFileItems.length === 0}
					>
						{`${buttonText} (${selectedFileItems.length})`}
					</button>
				)}
			</div>

			{!isCollapsed &&
				(loading ? (
					<div style={{ padding: "0 10px", color: "var(--text-muted)" }}>
						Loading...
					</div>
				) : (
					<RichTreeView
						aria-label={`${title} files`}
						items={fileTree}
						multiSelect
						checkboxSelection
						disableSelection={loading}
						selectedItems={selectedFileItems}
						onSelectedItemsChange={(_, ids) => {
							// console.log({ids})
							// Drop any folder IDs; keep files only
							const filesOnly = (ids as (string | number)[]).filter((id) =>
								fileIdSet.has(String(id))
							);
							onSelectionChange?.(filesOnly);
						}}
						selectionPropagation={{ descendants: true, parents: true }}
						itemChildrenIndentation={16}
						slots={{ item: CustomTreeItem }}
						sx={{ flexGrow: 1, maxWidth: "100%", color: "var(--text-normal)" }}
					/>
				))}
		</div>
	);
};

export class PublishStatusModal extends Modal {
	private props: PublishStatusModalProps;
	private root: ReturnType<typeof createRoot> | null = null;

	// Cache publish status across modal open/close cycles
	private static cachedStatus: PublishStatus | null = null;
	private static cachedSiteId: string | null = null;

	constructor(props: PublishStatusModalProps) {
		super(props.app);
		this.props = props;
	}

	static updateCache(status: PublishStatus | null, siteId: string | null) {
		PublishStatusModal.cachedStatus = status;
		PublishStatusModal.cachedSiteId = siteId;
	}

	static clearCache() {
		PublishStatusModal.cachedStatus = null;
		PublishStatusModal.cachedSiteId = null;
	}

	onOpen() {
		const container = this.contentEl.createDiv();
		container.addClass("publish-status-view");
		this.root = createRoot(container);
		this.root.render(
			<PublishStatusModalContent
				{...this.props}
				onClose={() => this.close()}
				initialStatus={PublishStatusModal.cachedStatus}
				initialSiteId={PublishStatusModal.cachedSiteId}
				onStatusUpdate={PublishStatusModal.updateCache}
			/>
		);
	}

	onClose() {
		if (this.root) {
			this.root.unmount();
		}
	}
}

interface PublishStatusModalContentProps extends PublishStatusModalProps {
	onClose: () => void;
	initialStatus: PublishStatus | null;
	initialSiteId: string | null;
	onStatusUpdate: (status: PublishStatus | null, siteId: string | null) => void;
}

const PublishStatusModalContent: React.FC<PublishStatusModalContentProps> = ({
	publisher,
	onClose,
	initialStatus,
	initialSiteId,
	onStatusUpdate,
}) => {
	const [publishStatus, setPublishStatus] =
		React.useState<PublishStatus | null>(initialStatus);
	const [publishStatusResponseStatus, setPublishStatusResponseStatus] =
		React.useState<"loading" | "success" | "error">(
			initialStatus ? "success" : "loading"
		);
	const [siteId, setSiteId] = React.useState<string | null>(initialSiteId);
	const [selectedBySection, setSelectedBySection] = React.useState<
		Record<"Changed" | "New" | "Deleted" | "Unchanged", string[]>
	>({
		Changed: [],
		New: [],
		Deleted: [],
		Unchanged: [],
	});
	const [isPublishing, setIsPublishing] = React.useState(false);

	// Disable all actions when either refreshing status or publishing
	const isDisabled = publishStatusResponseStatus === "loading" || isPublishing;

	const { unchangedFiles, changedFiles, newFiles, deletedFiles } =
		publishStatus || {
			unchangedFiles: [],
			changedFiles: [],
			newFiles: [],
			deletedFiles: [],
		};

	const isLoading = !publishStatus;

	const fetchStatus = async (isInitialLoad = false) => {
		// Only show loading state if we don't have cached data
		// if (!publishStatus) {
		//   setPublishStatusResponseStatus("loading");
		// }
		setPublishStatusResponseStatus("loading");
		try {
			// Fetch site ID for the settings link
			const id = await publisher.getSiteId();
			setSiteId(id);
			// Fetch publish status
			const status = await publisher.getPublishStatus();
			setPublishStatus(status);
			setPublishStatusResponseStatus("success");
			// Update the cache
			onStatusUpdate(status, id);
		} catch (e) {
			setPublishStatusResponseStatus("error");
			console.error("Failed to fetch publish status", e);
		}
	};

	React.useEffect(() => {
		// Always fetch fresh data, but if we have cached data it will show immediately
		fetchStatus(true);
	}, []);

	const refreshStatus = async () => {
		await fetchStatus();
	};

	const handlePublishOperation = async (
		operation: "publish" | "unpublish",
		count: number,
		action: () => Promise<{ siteUrl: string; filesPublished: number }>
	) => {
		setIsPublishing(true);
		try {
			new Notice(
				`⌛ ${
					operation === "publish" ? "Publishing" : "Unpublishing"
				} ${count} files...`
			);
			const result = await action();
			const frag = document.createDocumentFragment();
			frag.append(
				document.createTextNode(
					`✅ ${operation === "publish" ? "Published" : "Unpublished"} ${
						result.filesPublished
					} files. `
				)
			);

			if (result.siteUrl) {
				const a = document.createElement("a");
				a.href = result.siteUrl;
				a.textContent = "View site";
				a.target = "_blank";
				a.rel = "noopener noreferrer";
				frag.append(a);
			}

			new Notice(frag, 8000);
		} catch (e: any) {
			if (e instanceof FlowershowError) {
				new Notice(`❌ Couldn't ${operation} files: ${e.message}`);
			} else {
				new Notice(
					`❌ Couldn't ${operation} files. See console errors for more info.`
				);
			}
			console.error(e);
		} finally {
			setIsPublishing(false);
		}
		await fetchStatus();
	};

	const publishSelectedNewFiles = async () => {
		const selectedIds = selectedBySection.New;
		const files = mapIdsToTFiles(newFiles, selectedIds);

		await handlePublishOperation("publish", files.length, () =>
			publisher.publishBatch({ filesToPublish: files })
		);
	};

	const publishSelectedChangedFiles = async () => {
		const selectedIds = selectedBySection.Changed;
		const files = mapIdsToTFiles(changedFiles, selectedIds);
		await handlePublishOperation("publish", files.length, () =>
			publisher.publishBatch({ filesToPublish: files })
		);
	};

	const unpublishSelectedDeletedFiles = async () => {
		const paths = selectedBySection.Deleted;
		await handlePublishOperation("unpublish", paths.length, () =>
			publisher.publishBatch({ filesToDelete: paths })
		);
	};

	const unpublishSelectedUnchangedFiles = async () => {
		const paths = selectedBySection.Unchanged;
		await handlePublishOperation("unpublish", paths.length, () =>
			publisher.publishBatch({ filesToDelete: paths })
		);
	};

	return (
		<div>
			<div
				className="publish-header"
				style={{
					display: "flex",
					flexWrap: "nowrap",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "20px",
					padding: "10px",
					borderBottom: "1px solid var(--background-modifier-border)",
					maxWidth: "100%",
					gap: "12px",
				}}
			>
				<div style={{ flexGrow: 1, minWidth: 0 }}>
					<p
						className="publish-header-text"
						style={{
							margin: "0",
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
						}}
					>
						Publishing to{" "}
						<a
							href={
								siteId ? `${API_URL}/site/${siteId}/settings` : `${API_URL}/`
							}
							style={{
								color: "var(--text-accent)",
								textDecoration: "none",
							}}
						>
							{publisher.getSiteName()}
						</a>
					</p>
				</div>
				<div style={{ display: "flex", alignItems: "center" }}>
					<button
						onClick={async () => {
							if (!publishStatus) return;
							const filesToPublish = [
								...publishStatus.changedFiles,
								...publishStatus.newFiles,
							];
							const filesToDelete = publishStatus.deletedFiles;

							if (!filesToDelete.length && !filesToPublish.length) {
								new Notice("❌ Nothing new to publish or delete.");
								return;
							}

							await handlePublishOperation(
								"publish",
								filesToPublish.length + filesToDelete.length,
								() =>
									publisher.publishBatch({
										filesToPublish,
										filesToDelete,
									})
							);
						}}
						disabled={isDisabled}
						style={{
							marginRight: "8px",
							cursor: isDisabled ? "default" : "pointer",
						}}
					>
						Publish All
					</button>
					<button
						title="Refresh"
						className="clickable-icon"
						onClick={refreshStatus}
						disabled={isDisabled}
						style={{
							cursor: isDisabled ? "default" : "pointer",
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="svg-icon lucide-refresh-cw"
							style={{
								animation: isDisabled ? "spin 1s linear infinite" : "none",
							}}
						>
							<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
							<path d="M21 3v5h-5"></path>
							<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
							<path d="M3 21v-5h5"></path>
						</svg>
					</button>
				</div>
				{/* <div 
            className="clickable-icon" 
            onClick={() => {
              onClose();
              // @ts-ignore
              app.setting?.open();
              // @ts-ignore
              app.setting?.openTabById("obsidian-flowershow");
            }} 
            style={{ cursor: 'pointer' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="svg-icon lucide-settings">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div> */}
			</div>

			<div style={{ opacity: isLoading ? 0.7 : 1 }}>
				<Section
					title="Changed"
					count={changedFiles.length}
					items={changedFiles}
					buttonText="Update selected files"
					loading={isLoading}
					onButtonClick={publishSelectedChangedFiles}
					selectedItems={selectedBySection.Changed}
					onSelectionChange={(ids) => {
						setSelectedBySection((s) => ({ ...s, Changed: ids as string[] }));
					}}
				/>

				<Section
					title="New"
					count={newFiles.length}
					items={newFiles}
					buttonText="Publish selected files"
					loading={isLoading}
					onButtonClick={publishSelectedNewFiles}
					selectedItems={selectedBySection.New}
					onSelectionChange={(ids) =>
						setSelectedBySection((s) => ({ ...s, New: ids as string[] }))
					}
				/>

				<Section
					title="Deleted"
					count={deletedFiles.length}
					items={deletedFiles}
					buttonText="Unpublish selected files"
					loading={isLoading}
					onButtonClick={unpublishSelectedDeletedFiles}
					selectedItems={selectedBySection.Deleted}
					onSelectionChange={(ids) =>
						setSelectedBySection((s) => ({ ...s, Deleted: ids as string[] }))
					}
				/>

				<Section
					title="Unchanged (select to unpublish)"
					count={unchangedFiles.length}
					items={unchangedFiles}
					buttonText="Unpublish selected files"
					loading={isLoading}
					onButtonClick={unpublishSelectedUnchangedFiles}
					selectedItems={selectedBySection.Unchanged}
					onSelectionChange={(ids) =>
						setSelectedBySection((s) => ({ ...s, Unchanged: ids as string[] }))
					}
					defaultCollapsed={true}
				/>
			</div>
		</div>
	);
};

interface CustomTreeItemProps
	extends Omit<UseTreeItemParameters, "rootRef">,
		Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {}

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
	props: CustomTreeItemProps,
	ref: React.Ref<HTMLLIElement>
) {
	const { id, itemId, label, disabled, children, ...other } = props;

	const {
		getContextProviderProps,
		getRootProps,
		getContentProps,
		getIconContainerProps,
		getCheckboxProps,
		getLabelProps,
		getGroupTransitionProps,
		getDragAndDropOverlayProps,
		status,
	} = useTreeItem({ id, itemId, label, disabled, rootRef: ref });

	// const item = useTreeItemModel<ExtendedTreeItemProps>(itemId);

	let IconComp = InsertDriveFileIcon;
	if (status.expandable) {
		IconComp = FolderRoundedIcon;
	}

	return (
		<TreeItemProvider {...getContextProviderProps()}>
			<TreeItemRoot {...getRootProps(other)}>
				<TreeItemContent {...getContentProps()}>
					<TreeItemIconContainer {...getIconContainerProps()}>
						<TreeItemIcon status={status} />
					</TreeItemIconContainer>
					<Box sx={{ flexGrow: 1, display: "flex", gap: 1 }}>
						<TreeItemCheckbox {...getCheckboxProps()} />
						<IconComp fontSize="small" />
						<TreeItemLabel {...getLabelProps()} />
					</Box>
					<TreeItemDragAndDropOverlay {...getDragAndDropOverlayProps()} />
				</TreeItemContent>
				{children ? (
					<TreeItemGroupTransition {...getGroupTransitionProps()}>
						{children}
					</TreeItemGroupTransition>
				) : null}
			</TreeItemRoot>
		</TreeItemProvider>
	);
});

// --- Helpers: map selection (ids) -> TFile[] or string[] ---
function mapIdsToTFiles(pool: TFile[], ids: string[]): TFile[] {
	const byPath = new Map(pool.map((f) => [f.path, f]));
	return ids.map((id) => byPath.get(id)).filter((v): v is TFile => !!v);
}
