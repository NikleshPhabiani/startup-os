import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService, FirebaseService, Lists } from '@/shared';
import { Diff, Reviewer } from '@/shared/shell';

@Component({
  selector: 'app-reviews-panel',
  templateUrl: './reviews-panel.component.html',
  styleUrls: ['./reviews-panel.component.scss'],
})
export class ReviewsPanelComponent implements OnInit {
  isLoading: boolean = true;
  diffGroups: Diff[][] = [];

  constructor(
    private firebaseService: FirebaseService,
    private authService: AuthService,
    private router: Router,
  ) { }

  ngOnInit() {
    const urlEmail: string = this.router
      .parseUrl(this.router.url)
      .queryParams['email'];

    if (urlEmail) {
      // Show the page from a view of the user from url.
      this.getReviews(urlEmail);
    } else {
      // Show the page from current login view.
      this.getReviews(this.authService.userEmail);
    }
  }

  // Get diff/reviews from Database
  getReviews(userEmail: string) {
    this.firebaseService.getDiffs().subscribe(
      diffs => {
        // Diffs are categorized in 4 different lists
        this.diffGroups[Lists.NeedAttention] = [];
        this.diffGroups[Lists.CcedOn] = [];
        this.diffGroups[Lists.DraftReviews] = [];
        this.diffGroups[Lists.SubmittedReviews] = [];

        // Iterate over each object in res
        // and create Diff from proto and categorize
        // into a specific list.
        for (const diff of diffs) {
          // needAttentionOfList is a list of all reviewers,
          // where attention is requested
          const needAttentionOfList: string[] = diff.getReviewerList()
            .filter(reviewer => reviewer.getNeedsAttention())
            .map(reviewer => reviewer.getEmail());

          if (diff.getAuthor().getEmail() === userEmail) {
            // Current user is an author of the diff
            switch (diff.getStatus()) {
              case Diff.Status.SUBMITTED:
                // Submitted Review
                this.diffGroups[Lists.SubmittedReviews].push(diff);
                break;
              case Diff.Status.REVIEW_NOT_STARTED:
                // Draft Review
                this.diffGroups[Lists.DraftReviews].push(diff);
                break;
            }
            // Attention of current user as an author is requested
            if (diff.getAuthor().getNeedsAttention()) {
              this.diffGroups[Lists.NeedAttention].push(diff);
            }
          } else if (needAttentionOfList.includes(userEmail)) {
            // Need attention of user
            this.diffGroups[Lists.NeedAttention].push(diff);
          } else if (diff.getCcList().includes(userEmail)) {
            // User is cc'ed on this
            this.diffGroups[Lists.CcedOn].push(diff);
          }
        }

        this.sortDiffs();
        this.isLoading = false;
      },
      () => {
        // Permission Denied
      },
    );
  }

  // Sort the diffs based on their date modified
  sortDiffs(): void {
    for (const diffList of this.diffGroups) {
      diffList.sort((a, b) => {
        return Math.sign(a.getModifiedTimestamp() - b.getModifiedTimestamp());
      });
    }
  }

  // Navigate to a Diff
  diffClicked(diffId: number): void {
    this.router.navigate(['diff/', diffId]);
  }

  getUsernames(reviewerList: Reviewer[]): string {
    return reviewerList
      .map(reviewer => this.authService.getUsername(reviewer.getEmail()))
      .join(', ');
  }
}
