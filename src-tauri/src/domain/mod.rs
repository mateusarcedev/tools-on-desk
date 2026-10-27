pub mod audio;
pub mod download;
pub mod history;
pub mod image;
pub mod media;
pub mod poster;
pub mod task;
pub mod video;

pub use audio::{AudioConvertOptions, AudioTrimOptions};
pub use download::{DownloadFormatOption, DownloadOptions, MediaDownloadInfo, PlaylistItemInfo, YtDlpStatus};
pub use history::HistoryEntry;
pub use image::{ImageConvertOptions, ImagesToPdfOptions};
pub use media::{AudioStreamInfo, MediaInfo, VideoStreamInfo};
pub use poster::{PosterOptions, PosterSpec};
pub use task::{Task, TaskStatus};
pub use video::{
    VideoCompressOptions, VideoConvertOptions, VideoExtractAudioOptions, VideoExtractFrameOptions,
    VideoTrimOptions,
};
