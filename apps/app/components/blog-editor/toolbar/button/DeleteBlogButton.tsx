import { Trash2 } from "lucide-react";
import { Button } from "./Button";

export function DeleteBlogButton() {

    return (
        <Button
            title={onDeleteBlog ? 'Delete blog' : 'Save the blog first to delete it'}
            onClick={onDeleteBlog}
            disabled={!onDeleteBlog}
        >
            <Trash2 size={18} />
        </Button>
    )
}