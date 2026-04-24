import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { backgroundColor, lightgrey, accent } from "../../shared/theme/colors";
import { apiService } from "../../services/api";
import { User, isAdmin } from "../../shared/types/user";

const Article = styled.article`
  width: 100vw;
  min-height: 100vh;
  margin: 0;
  padding: 3rem 2rem 2rem 2rem;
  background: ${backgroundColor};
  position: relative;

  display: flex;
  flex-direction: column;
  align-items: center;

  > * {
    max-width: 800px;
    width: 100%;
  }

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;

    > * {
      max-width: 100%;
    }
  }
`;

const Title = styled.h1`
  color: ${accent};
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
  text-align: center;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 800px;
  width: 100%;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: ${accent};
  font-weight: 600;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: ${lightgrey};
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${accent};
    background: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: ${lightgrey};
  font-size: 1rem;
  min-height: 400px;
  resize: vertical;
  transition: all 0.2s ease;
  font-family: inherit;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: ${accent};
    background: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const SaveButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${accent};
  color: ${backgroundColor};
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: ${lightgrey};
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: ${accent};
    color: ${accent};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: center;
`;

const HelpText = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  margin-top: 0.25rem;
`;

interface NewPostProps {
  user?: User | null;
  onPostsChange?: () => Promise<void>;
}

const NewPost: React.FC<NewPostProps> = ({ user, onPostsChange }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    slug: "",
    body: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  if (!isAdmin(user)) {
    navigate("/posts");
    return null;
  }

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (value: string) => {
    handleChange("title", value);
    if (!form.slug || form.slug === generateSlug(form.title)) {
      handleChange("slug", generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const postData = {
        title: form.title,
        slug: form.slug,
        body: form.body,
        date: form.date ? new Date(form.date) : undefined,
      };

      const newPost = await apiService.createPost(postData);
      // Refresh posts data first to ensure new post is in the list
      await onPostsChange?.();
      // sleep 100ms to ensure the new post is available
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Then navigate to the post detail page
      navigate(`/posts/${newPost.slug}`);
    } catch (err) {
      console.error("Failed to create post:", err);
      setError("Failed to create post. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/posts");
  };

  return (
    <Article>
      <Title>Create New Post</Title>
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter post title"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            type="text"
            value={form.slug}
            onChange={(e) => handleChange("slug", e.target.value)}
            placeholder="Enter post slug (auto-generated from title)"
            required
          />
          <HelpText>
            The slug is used in the URL: /posts/{form.slug || "your-slug"}
          </HelpText>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => handleChange("date", e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="body">Body</Label>
          <TextArea
            id="body"
            value={form.body}
            onChange={(e) => handleChange("body", e.target.value)}
            placeholder="Enter post content (HTML supported)"
            required
          />
          <HelpText>
            You can use HTML tags for formatting: &lt;p&gt;, &lt;h2&gt;,
            &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, etc.
          </HelpText>
        </FormGroup>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <FormActions>
          <CancelButton type="button" onClick={handleCancel}>
            Cancel
          </CancelButton>
          <SaveButton type="submit" disabled={isSaving}>
            {isSaving ? "Creating..." : "Create Post"}
          </SaveButton>
        </FormActions>
      </Form>
    </Article>
  );
};

export default NewPost;

