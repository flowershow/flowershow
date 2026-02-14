// DONE
export default class PublishStatusBar {
  statusBarContainer: HTMLSpanElement;

  publishCounter: number;
  publishTotal: number;
  deleteCounter: number;
  deleteTotal: number;

  constructor(statusBarContainer: HTMLSpanElement) {
    this.statusBarContainer = statusBarContainer;
    this.publishCounter = 0;
    this.deleteCounter = 0;
  }

  incrementPublish() {
    ++this.publishCounter;
    this.updateStatus();
  }

  incrementDelete() {
    ++this.deleteCounter;
    this.updateStatus();
  }

  private updateStatus() {
    const publishStatus =
      this.publishTotal > 0
        ? ` Publishing: ${this.publishCounter}/${this.publishTotal}`
        : "";
    const deleteStatus =
      this.deleteTotal > 0
        ? ` Unpublishing: ${this.deleteCounter}/${this.deleteTotal}`
        : "";

    if (publishStatus && deleteStatus) {
      this.statusBarContainer.innerText = `${publishStatus}, ${deleteStatus}`;
    } else if (publishStatus) {
      this.statusBarContainer.innerText = `${publishStatus}`;
    } else if (deleteStatus) {
      this.statusBarContainer.innerText = `${deleteStatus}`;
    }
  }

  start({
    publishTotal = 0,
    deleteTotal = 0,
  }: {
    publishTotal?: number;
    deleteTotal?: number;
  }) {
    if (!publishTotal && !deleteTotal) return;
    this.publishTotal = publishTotal;
    this.deleteTotal = deleteTotal;
    // Reset counters and status bar when starting new operation
    this.publishCounter = 0;
    this.deleteCounter = 0;
    this.statusBarContainer.innerText = "";
    this.updateStatus();
  }

  finish(displayDurationMillisec: number) {
    setTimeout(() => {
      this.statusBarContainer.innerText = "";
    }, displayDurationMillisec);
  }

  error() {
    this.statusBarContainer.innerText = "";
  }
}
