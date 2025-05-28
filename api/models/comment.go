
package models

type Comment struct {
    ID      int    `json:"id"`
    PostID  int    `json:"post_id"`
    Content string `json:"content"`
    Author  string `json:"author"`
}
