package handlers

import (
	"net/http"
	"strconv"
	"blogapi/middleware"
	"blogapi/models"
	"github.com/gin-gonic/gin"
)

var comments = []models.Comment{}

func GetComments(c *gin.Context) {
	postID := c.Query("post_id")
	if postID == "" {
		c.JSON(http.StatusOK, comments)
		return
	}
	id, err := strconv.Atoi(postID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post_id"})
		return
	}
	var filtered []models.Comment
	for _, cm := range comments {
		if cm.PostID == id {
			filtered = append(filtered, cm)
		}
	}
	c.JSON(http.StatusOK, filtered)
}

func CreateComment(c *gin.Context) {
	var cm models.Comment
	if err := c.BindJSON(&cm); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	cm.ID = len(comments) + 1
	claims := c.MustGet("user").(*middleware.Claims)
	cm.Author = claims.Username
	comments = append(comments, cm)
	c.JSON(http.StatusCreated, cm)
}
