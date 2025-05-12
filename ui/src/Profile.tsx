import React from "react";
import styled from "styled-components";

interface ProfileProps {
  avatarUrl: string;
  name: string;
  title?: string;
  bio?: string;
}

const Card = styled.div`
  width: 280px;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 4px 4px 16px rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  transform: translateY(-2px) scale(1.1);
  padding: 1.5rem;
  text-align: center;
  font-family: theia, sans-serif;
  z-index: 1;
  /* push to right */
  margin-left: auto;
  margin-right: 0;
`;

const Avatar = styled.img`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1rem;
`;

const Name = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: #333;
`;

const Title = styled.p`
  margin: 0.25rem 0 1rem;
  font-size: 0.9rem;
  color: #666;
`;

const Bio = styled.p`
  font-size: 0.875rem;
  color: #444;
  margin-bottom: 1rem;
  line-height: 1.4;
`;

export const Profile: React.FC<ProfileProps> = ({
  avatarUrl,
  name,
  title,
  bio,
}) => (
  <Card>
    <Avatar src={avatarUrl} alt={`${name}’s avatar`} />
    <Name>{name}</Name>
    {title && <Title>{title}</Title>}
    {bio && <Bio>{bio}</Bio>}
  </Card>
);

export default Profile;
