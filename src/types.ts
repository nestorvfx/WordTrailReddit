export type WebViewMessage =
    | {
        type: 'initialData';
        data: {
            username: string,
            userID: string,
            userAllowedToCreate: boolean,
            postType: string
        };
    }
    | {
        type: 'sendCategories';
        data: {
            usersCategories: string,
            cursor: number
        };
    }
    | {
        type: 'sendCategory';
        data: {
            category: string
        };
    }
    | {
        type: 'requestUserData';
        data: {
        };
    }
    | {
        type: 'sendUserData';
        data: {
            createdCategories: string,
        };
    }
    | {
        type: 'updateCategories';
        data: {
            cursor: number,
            sortMethod?: string,
            reversed?: boolean
        };
    }
    | {
        type: 'deleteCategory';
        data: {
            categoryCode: string
        };
    }
    | {
        type: 'categoryDeleted';
        data: {
            deleted: boolean
        };
    }
    | {
        type: 'deleteAllUserData';
        data: {
        };
    }
    | {
        type: 'allDataDeleted';
        data: {
            deleted: boolean
        };
    }
    | {
        type: 'startForm';
        data: {};
    }
    | {
        type: 'formOpened';
        data: {
            correctly: string
        };
    }
    | {
        type: 'formCorrect';
        data: {
            categoryTitle: string
        };
    }
    | {
        type: 'formIncorrect';
        data: {
            wordsCorrect: boolean,
            titleCorrect: boolean
        };
    }
    | {
        type: 'wordsRequest';
        data: {
            categoryCode: string
        };
    }
    | {
        type: 'sendCategoryWords';
        data: {
            words: string
        };
    }
    | {
        type: 'updateCategoryInfo';
        data: {
            categoryCode: string,
            newScore: number,
            guessedAll: boolean,
            previousHSID?: string
        };
    }
    | {
        type: 'webViewStarted';
        data: {
        };
    }
    | {
        type: 'categoryUpdateFeedback';
        data: {
            information: string,
            categoryInfo?: string
        };
    }
    | {
        type: 'updateCategoryFeedback';
        data: {
            information: string,
            categoryInfo?: string
        };
    }
    | {
        type: 'deleteCategoryResponse';
        data: {
            success: boolean,
            message?: string,
            categoryCode?: string
        };
    };

export type CategoryUpdateInfo = {
    categoryCode: string,
    newScore: number,
    guessedAll: boolean,
    previousHSID?: string
};